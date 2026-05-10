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
const MAX_USAGE_EXTRACTION_RESPONSE_BYTES = 1_000_000;
const MAX_STREAM_INTENT_REQUEST_BYTES = 1_000_000;

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

function headerIncludes(headers: IncomingHttpHeaders, name: string, expectedValue: string): boolean {
  const value = headers[name.toLowerCase()];
  const values = Array.isArray(value) ? value : [value];
  const normalizedExpectedValue = expectedValue.toLowerCase();

  return values.some((entry) => typeof entry === "string" && entry.toLowerCase().includes(normalizedExpectedValue));
}

function isJsonResponse(headers: IncomingHttpHeaders): boolean {
  return headerIncludes(headers, "content-type", "json");
}

function isSseResponse(headers: IncomingHttpHeaders): boolean {
  return headerIncludes(headers, "content-type", "text/event-stream");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasStreamingRequestIntent(requestBody: Buffer | undefined): boolean {
  if (!requestBody || requestBody.length > MAX_STREAM_INTENT_REQUEST_BYTES) {
    return false;
  }

  try {
    const parsed: unknown = JSON.parse(requestBody.toString("utf8"));
    return isObject(parsed) && parsed.stream === true;
  } catch {
    return false;
  }
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

  let authContext;
  try {
    authContext = await validateApiKey(clientApiKey);
  } catch (error) {
    console.warn("API key validation failed", error);
  }

  if (!authContext) {
    sendAuthenticationError(res);
    return;
  }

  const upstreamUrl = buildOpenAiUrl(req.originalUrl);
  const apiKey = getOpenAiApiKey();
  const requestBody = getRequestBody(req);
  const headers = copyHeaders(req.headers);
  const startedAt = Date.now();
  const requestHasStreamingIntent = hasStreamingRequestIntent(requestBody);

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
      const shouldExtractUsage =
        !requestHasStreamingIntent && !isSseResponse(upstreamResponse.headers) && isJsonResponse(upstreamResponse.headers);
      const responseChunks: Buffer[] = [];
      let collectedBytes = 0;
      let responseTooLargeForExtraction = false;

      for (const [name, value] of Object.entries(upstreamResponse.headers)) {
        if (!value || HOP_BY_HOP_HEADERS.has(name.toLowerCase())) {
          continue;
        }

        res.setHeader(name, value);
      }

      res.statusCode = statusCode;

      upstreamResponse.on("data", (chunk: Buffer | string) => {
        if (shouldExtractUsage && !responseTooLargeForExtraction) {
          const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          const nextCollectedBytes = collectedBytes + bufferChunk.length;

          if (nextCollectedBytes > MAX_USAGE_EXTRACTION_RESPONSE_BYTES) {
            responseChunks.length = 0;
            collectedBytes = 0;
            responseTooLargeForExtraction = true;
          } else {
            responseChunks.push(bufferChunk);
            collectedBytes = nextCollectedBytes;
          }
        }

        if (res.destroyed) {
          upstreamResponse.destroy();
          return;
        }

        if (!res.write(chunk)) {
          upstreamResponse.pause();
          res.once("drain", () => {
            upstreamResponse.resume();
          });
        }
      });

      upstreamResponse.on("end", () => {
        res.end();

        if (!shouldExtractUsage || responseTooLargeForExtraction) {
          return;
        }

        const responseBody = Buffer.concat(responseChunks, collectedBytes);
        const usagePayload = extractOpenAiUsagePayload({
          endpoint: upstreamUrl.pathname,
          statusCode,
          latencyMs: Math.max(Date.now() - startedAt, 0),
          headers: upstreamResponse.headers,
          body: responseBody
        });

        if (!usagePayload) {
          return;
        }

        const usageLog = {
          organizationId: authContext.organizationId,
          provider: "openai" as const,
          ...usagePayload,
          ...calculateCostEnergyCo2(usagePayload)
        };

        console.log("OpenAI usage extracted", usageLog);

        void logUsage(usageLog).catch((error: unknown) => {
          console.warn("OpenAI usage persistence failed", error);
        });
      });

      upstreamResponse.on("error", (error) => {
        res.destroy(error);
      });

      res.on("close", () => {
        if (!res.writableEnded) {
          upstreamResponse.destroy();
        }
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
