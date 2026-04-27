import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import express from "express";
import { openAiProxy } from "./proxy/openaiProxy.js";

for (const envFile of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "..", "..", ".env")]) {
  if (existsSync(envFile)) {
    loadEnvFile(envFile);
    break;
  }
}

const app = express();
const port = Number(process.env.PORT || 4000);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

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
