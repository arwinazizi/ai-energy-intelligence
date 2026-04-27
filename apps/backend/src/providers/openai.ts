const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com";
const PROXY_PREFIX = "/openai";

export function buildOpenAiUrl(originalUrl: string): URL {
  const baseUrl = process.env.OPENAI_BASE_URL?.trim() || DEFAULT_OPENAI_BASE_URL;
  const upstreamPath = originalUrl.startsWith(PROXY_PREFIX)
    ? originalUrl.slice(PROXY_PREFIX.length) || "/"
    : originalUrl;

  return new URL(upstreamPath, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
}

export function getOpenAiApiKey(): string | undefined {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  return apiKey || undefined;
}
