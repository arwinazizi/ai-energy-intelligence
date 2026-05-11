import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import type { NextFunction, Request, Response } from "express";
import express from "express";
import { summaryApi } from "./api/summary.js";
import { openAiProxy } from "./proxy/openaiProxy.js";

for (const envFile of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "..", "..", ".env")]) {
  if (existsSync(envFile)) {
    loadEnvFile(envFile);
    break;
  }
}

const app = express();
const port = Number(process.env.PORT || 4000);
const dashboardCorsOrigin = process.env.DASHBOARD_CORS_ORIGIN?.trim() || "*";

function allowDashboardApiCors(req: Request, res: Response, next: NextFunction): void {
  res.setHeader("Access-Control-Allow-Origin", dashboardCorsOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-api-key");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", allowDashboardApiCors, summaryApi);

app.use(
  "/openai",
  express.raw({
    type: () => true,
    limit: "25mb"
  }),
  openAiProxy
);

app.listen(port, () => {
  console.log(`AI Energy Intelligence backend listening on http://127.0.0.1:${port}`);
});
