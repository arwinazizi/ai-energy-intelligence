import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { Router } from "express";

const SESSION_COOKIE_NAME = "aei_dashboard_session";
const DEFAULT_SESSION_SECONDS = 12 * 60 * 60;

type DashboardAuthConfig = {
  username: string;
  passwordHash: string;
  sessionSecret: string;
  maxAgeSeconds: number;
  secureCookie: boolean;
};

type SessionPayload = {
  username: string;
  expiresAt: number;
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const value = process.env[name]?.trim();
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readConfig(): DashboardAuthConfig | null {
  const configuredHash = process.env.DASHBOARD_PILOT_PASSWORD_SHA256?.trim().toLowerCase();
  const configuredPassword = process.env.DASHBOARD_PILOT_PASSWORD?.trim();
  const passwordHash = configuredHash || (configuredPassword ? sha256(configuredPassword) : "");

  if (!passwordHash) {
    return null;
  }

  return {
    username: process.env.DASHBOARD_PILOT_USERNAME?.trim() || "pilot",
    passwordHash,
    sessionSecret: process.env.DASHBOARD_SESSION_SECRET?.trim() || passwordHash,
    maxAgeSeconds: readPositiveIntegerEnv("DASHBOARD_SESSION_SECONDS", DEFAULT_SESSION_SECONDS),
    secureCookie: process.env.DASHBOARD_COOKIE_SECURE?.trim().toLowerCase() === "true"
  };
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string | null {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function serializeCookie(name: string, value: string, options: { maxAgeSeconds: number; secure: boolean }): string {
  const parts = [
    `${name}=${value}`,
    "Path=/api/dashboard",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${options.maxAgeSeconds}`
  ];

  if (options.secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function clearSessionCookie(secure: boolean): string {
  return serializeCookie(SESSION_COOKIE_NAME, "", {
    maxAgeSeconds: 0,
    secure
  });
}

function createSessionCookie(config: DashboardAuthConfig): string {
  const payload: SessionPayload = {
    username: config.username,
    expiresAt: Date.now() + config.maxAgeSeconds * 1000
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload, config.sessionSecret);

  return serializeCookie(SESSION_COOKIE_NAME, `${encodedPayload}.${signature}`, {
    maxAgeSeconds: config.maxAgeSeconds,
    secure: config.secureCookie
  });
}

function getCookie(req: Request, name: string): string | null {
  const cookieHeader = req.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValueParts] = part.trim().split("=");
    if (rawName === name) {
      return rawValueParts.join("=") || null;
    }
  }

  return null;
}

function readSession(req: Request, config: DashboardAuthConfig): SessionPayload | null {
  const cookie = getCookie(req, SESSION_COOKIE_NAME);
  if (!cookie) {
    return null;
  }

  const [encodedPayload, signature] = cookie.split(".");
  if (!encodedPayload || !signature || !safeEqual(signature, sign(encodedPayload, config.sessionSecret))) {
    return null;
  }

  const decoded = base64UrlDecode(encodedPayload);
  if (!decoded) {
    return null;
  }

  try {
    const parsed = JSON.parse(decoded) as Partial<SessionPayload>;
    if (parsed.username !== config.username || typeof parsed.expiresAt !== "number" || parsed.expiresAt <= Date.now()) {
      return null;
    }

    return {
      username: parsed.username,
      expiresAt: parsed.expiresAt
    };
  } catch {
    return null;
  }
}

function sendUnauthenticated(res: Response): void {
  res.json({
    authenticated: false
  });
}

export const dashboardSessionApi = Router();

dashboardSessionApi.get("/session", (req: Request, res: Response) => {
  const config = readConfig();
  const session = config ? readSession(req, config) : null;

  if (!session) {
    sendUnauthenticated(res);
    return;
  }

  res.json({
    authenticated: true,
    username: session.username,
    expires_at: new Date(session.expiresAt).toISOString()
  });
});

dashboardSessionApi.post("/login", (req: Request, res: Response) => {
  const config = readConfig();
  if (!config) {
    res.status(503).json({
      error: {
        message: "Dashboard login is not configured",
        type: "dashboard_auth_unconfigured"
      }
    });
    return;
  }

  const body = req.body as Partial<Record<string, unknown>>;
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (username !== config.username || !safeEqual(sha256(password), config.passwordHash)) {
    res.status(401).json({
      error: {
        message: "Invalid dashboard login",
        type: "dashboard_authentication_error"
      }
    });
    return;
  }

  const expiresAt = Date.now() + config.maxAgeSeconds * 1000;
  res.setHeader("Set-Cookie", createSessionCookie(config));
  res.json({
    authenticated: true,
    username: config.username,
    expires_at: new Date(expiresAt).toISOString()
  });
});

dashboardSessionApi.post("/logout", (_req: Request, res: Response) => {
  const config = readConfig();
  res.setHeader("Set-Cookie", clearSessionCookie(config?.secureCookie ?? false));
  sendUnauthenticated(res);
});
