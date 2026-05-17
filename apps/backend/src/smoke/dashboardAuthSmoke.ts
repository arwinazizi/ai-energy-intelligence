import http from "node:http";
import express from "express";
import { dashboardSessionApi } from "../auth/dashboardSession.js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function listen(server: http.Server): Promise<number> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => {
      reject(error);
    };

    server.once("error", onError);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", onError);
      const address = server.address();
      assert(typeof address === "object" && address !== null, "Server did not expose a TCP address");
      resolve(address.port);
    });
  });
}

function close(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function createAuthServer(): http.Server {
  const app = express();

  app.use(express.json());
  app.use("/api/dashboard", dashboardSessionApi);

  return http.createServer(app);
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const body: unknown = await response.json();
  assert(isObject(body), "Expected JSON object response");

  return body;
}

async function postJson(url: string, body: Record<string, unknown>, cookie?: string): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {})
    },
    body: JSON.stringify(body)
  });
}

const previousUsername = process.env.DASHBOARD_PILOT_USERNAME;
const previousPassword = process.env.DASHBOARD_PILOT_PASSWORD;
const previousPasswordHash = process.env.DASHBOARD_PILOT_PASSWORD_SHA256;
const previousSessionSecret = process.env.DASHBOARD_SESSION_SECRET;
const previousSessionSeconds = process.env.DASHBOARD_SESSION_SECONDS;
const previousCookieSecure = process.env.DASHBOARD_COOKIE_SECURE;
const authServer = createAuthServer();

try {
  process.env.DASHBOARD_PILOT_USERNAME = "pilot";
  process.env.DASHBOARD_PILOT_PASSWORD = "correct-password";
  delete process.env.DASHBOARD_PILOT_PASSWORD_SHA256;
  process.env.DASHBOARD_SESSION_SECRET = "dashboard-auth-smoke-secret";
  process.env.DASHBOARD_SESSION_SECONDS = "900";
  delete process.env.DASHBOARD_COOKIE_SECURE;

  const port = await listen(authServer);
  const baseUrl = `http://127.0.0.1:${port}/api/dashboard`;

  const unauthenticatedSession = await fetch(`${baseUrl}/session`);
  assert(unauthenticatedSession.status === 200, "Unauthenticated session check should return 200");
  assert((await readJson(unauthenticatedSession)).authenticated === false, "Session should start unauthenticated");

  const invalidLogin = await postJson(`${baseUrl}/login`, {
    username: "pilot",
    password: "wrong-password"
  });
  assert(invalidLogin.status === 401, `Invalid login expected 401, received ${invalidLogin.status}`);
  const invalidLoginBody = await readJson(invalidLogin);
  assert(isObject(invalidLoginBody.error), "Invalid login should return a JSON error object");
  assert(invalidLoginBody.error.type === "dashboard_authentication_error", "Invalid login error type is wrong");
  assert(!invalidLogin.headers.get("set-cookie"), "Invalid login should not set a session cookie");

  const validLogin = await postJson(`${baseUrl}/login`, {
    username: "pilot",
    password: "correct-password"
  });
  assert(validLogin.status === 200, `Valid login expected 200, received ${validLogin.status}`);
  const validLoginBody = await readJson(validLogin);
  assert(validLoginBody.authenticated === true, "Valid login should authenticate");
  assert(validLoginBody.username === "pilot", "Valid login should return the pilot username");
  const sessionCookie = validLogin.headers.get("set-cookie");
  assert(sessionCookie, "Valid login should set a session cookie");
  assert(sessionCookie.includes("aei_dashboard_session="), "Valid login should set a session cookie");
  assert(sessionCookie.includes("HttpOnly"), "Session cookie should be HttpOnly");
  assert(sessionCookie.includes("SameSite=Lax"), "Session cookie should use SameSite=Lax");

  const authenticatedSession = await fetch(`${baseUrl}/session`, {
    headers: {
      cookie: sessionCookie
    }
  });
  assert(authenticatedSession.status === 200, "Authenticated session check should return 200");
  const authenticatedSessionBody = await readJson(authenticatedSession);
  assert(authenticatedSessionBody.authenticated === true, "Session cookie should authenticate");
  assert(authenticatedSessionBody.username === "pilot", "Session should return the pilot username");

  const logout = await postJson(`${baseUrl}/logout`, {}, sessionCookie);
  assert(logout.status === 200, `Logout expected 200, received ${logout.status}`);
  assert((await readJson(logout)).authenticated === false, "Logout should return unauthenticated state");
  const logoutCookie = logout.headers.get("set-cookie");
  assert(logoutCookie?.includes("Max-Age=0"), "Logout should clear the session cookie");

  console.log("Dashboard auth smoke test passed");
} finally {
  if (previousUsername === undefined) {
    delete process.env.DASHBOARD_PILOT_USERNAME;
  } else {
    process.env.DASHBOARD_PILOT_USERNAME = previousUsername;
  }
  if (previousPassword === undefined) {
    delete process.env.DASHBOARD_PILOT_PASSWORD;
  } else {
    process.env.DASHBOARD_PILOT_PASSWORD = previousPassword;
  }
  if (previousPasswordHash === undefined) {
    delete process.env.DASHBOARD_PILOT_PASSWORD_SHA256;
  } else {
    process.env.DASHBOARD_PILOT_PASSWORD_SHA256 = previousPasswordHash;
  }
  if (previousSessionSecret === undefined) {
    delete process.env.DASHBOARD_SESSION_SECRET;
  } else {
    process.env.DASHBOARD_SESSION_SECRET = previousSessionSecret;
  }
  if (previousSessionSeconds === undefined) {
    delete process.env.DASHBOARD_SESSION_SECONDS;
  } else {
    process.env.DASHBOARD_SESSION_SECONDS = previousSessionSeconds;
  }
  if (previousCookieSecure === undefined) {
    delete process.env.DASHBOARD_COOKIE_SECURE;
  } else {
    process.env.DASHBOARD_COOKIE_SECURE = previousCookieSecure;
  }

  await close(authServer);
}
