import { createHash } from "node:crypto";
import { selectSupabaseRows } from "../db/supabase.js";

export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  const keyHash = hashApiKey(apiKey);
  const rows = await selectSupabaseRows("api_keys", {
    query: {
      select: "id",
      key_hash: `eq.${keyHash}`,
      limit: "1"
    }
  });

  return rows.length > 0;
}
