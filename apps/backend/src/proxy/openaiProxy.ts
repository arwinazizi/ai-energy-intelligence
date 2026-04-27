import type { IncomingHttpHeaders } from "node:http";
import http from "node:http";
import https from "node:https";
import type { Request, Response } from "express";
import { buildOpenAiUrl, getOpenAiApiKey } from "../providers/openai.js";

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
    if (HOP_BY_HOP_HEADERS.has(normalizedName) || normalizedName === "host") {
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

export function openAiProxy(req: Request, res: Response): void {
  const upstreamUrl = buildOpenAiUrl(req.originalUrl);
  const apiKey = getOpenAiApiKey();
  const requestBody = getRequestBody(req);
  const headers = copyHeaders(req.headers);

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
      res.status(upstreamResponse.statusCode || 502);

      for (const [name, value] of Object.entries(upstreamResponse.headers)) {
        if (!value || HOP_BY_HOP_HEADERS.has(name.toLowerCase())) {
          continue;
        }

        res.setHeader(name, value);
      }

      upstreamResponse.pipe(res);
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
