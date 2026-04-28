import type { IncomingHttpHeaders } from "node:http";
import http from "node:http";
import https from "node:https";
import type { Request, Response } from "express";
import { calculateCostEnergyCo2 } from "@aei/shared";
import { validateApiKey } from "../auth/validateApiKey.js";
import { logUsage } from "../logging/logUsage.js";
import { buildOpenAiUrl, getOpenAiApiKey } from "../providers/openai.js";
import { extractOpenAiUsagePayload } from "./usageExtraction.js";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "trailers",
  "transfer-encoding",
  "upgrade"
]);

const REQUEST_BODYLESS_METHODS = new Set(["GET", "HEAD"]);

function copyHeaders(headers: IncomingHttpHeaders): Record<string, string | string[]> {
  const copiedHeaders: Record<string, string | string[]> = {};

  for (const [name, value] of Object.entries(headers)) {
    if (!value) {
      continue;
    }

    const normalizedName = name.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(normalizedName) || normalizedName === "host" || normalizedName === "x-api-key") {
      continue;
    }

    copiedHeaders[name] = value;
  }

  return copiedHeaders;
}

function getRequestBody(req: Request): Buffer | undefined {
  if (REQUEST_BODYLESS_METHODS.has(req.method.toUpperCase())) {
    return undefined;
  }

  return Buffer.isBuffer(req.body) && req.body.length > 0 ? req.body : undefined;
}

function getClientApiKey(req: Request): string | undefined {
  const value = req.get("x-api-key")?.trim();
  return value || undefined;
}

function sendAuthenticationError(res: Response): void {
  res.status(401).json({
    error: {
      message: "Missing or invalid API key",
      type: "authentication_error"
    }
  });
}

export async function openAiProxy(req: Request, res: Response): Promise<void> {
  const clientApiKey = getClientApiKey(req);

  if (!clientApiKey) {
    sendAuthenticationError(res);
    return;
  }

  let isAuthorized = false;
  try {
    isAuthorized = await validateApiKey(clientApiKey);
  } catch (error) {
    console.warn("API key validation failed", error);
  }

  if (!isAuthorized) {
    sendAuthenticationError(res);
    return;
  }

  const upstreamUrl = buildOpenAiUrl(req.originalUrl);
  const apiKey = getOpenAiApiKey();
  const requestBody = getRequestBody(req);
  const headers = copyHeaders(req.headers);
  const startedAt = Date.now();

  if (apiKey && !headers.authorization) {
    headers.authorization = `Bearer ${apiKey}`;
  }

  if (requestBody) {
    headers["content-length"] = String(requestBody.length);
  } else {
    delete headers["content-length"];
  }

  const transport = upstreamUrl.protocol === "http:" ? http : https;
  const upstreamRequest = transport.request(
    upstreamUrl,
    {
      method: req.method,
      headers
    },
    (upstreamResponse) => {
      const statusCode = upstreamResponse.statusCode || 502;
      const responseChunks: Buffer[] = [];

      for (const [name, value] of Object.entries(upstreamResponse.headers)) {
        if (!value || HOP_BY_HOP_HEADERS.has(name.toLowerCase())) {
          continue;
        }

        res.setHeader(name, value);
      }

      upstreamResponse.on("data", (chunk: Buffer | string) => {
        responseChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });

      upstreamResponse.on("end", () => {
        const responseBody = Buffer.concat(responseChunks);
        const usagePayload = extractOpenAiUsagePayload({
          endpoint: upstreamUrl.pathname,
          statusCode,
          latencyMs: Math.max(Date.now() - startedAt, 0),
          headers: upstreamResponse.headers,
          body: responseBody
        });
        const usageLog = usagePayload
          ? {
              provider: "openai" as const,
              ...usagePayload,
              ...calculateCostEnergyCo2(usagePayload)
            }
          : undefined;

        if (usageLog) {
          console.log("OpenAI usage extracted", usageLog);
        }

        res.status(statusCode).end(responseBody);

        if (usageLog) {
          void logUsage(usageLog).catch((error: unknown) => {
            console.warn("OpenAI usage persistence failed", error);
          });
        }
      });

      upstreamResponse.on("error", (error) => {
        res.destroy(error);
      });
    }
  );

  upstreamRequest.on("error", (error) => {
    if (res.headersSent) {
      res.destroy(error);
      return;
    }

    res.status(502).json({
      error: {
        message: "OpenAI upstream request failed",
        type: "upstream_error"
      }
    });
  });

  if (requestBody) {
    upstreamRequest.write(requestBody);
  }

  upstreamRequest.end();
}
