import { createHash } from "node:crypto";
import { selectSupabaseRows } from "../db/supabase.js";

export type ApiKeyAuthContext = {
  apiKeyId: string;
  organizationId: string;
};

export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

function toString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export async function validateApiKey(apiKey: string): Promise<ApiKeyAuthContext | null> {
  const keyHash = hashApiKey(apiKey);
  const rows = await selectSupabaseRows("api_keys", {
    query: {
      select: "id,organization_id",
      key_hash: `eq.${keyHash}`,
      limit: "1"
    }
  });

  const row = rows[0];
  if (!row) {
    return null;
  }

  const apiKeyId = toString(row.id);
  const organizationId = toString(row.organization_id);

  if (!apiKeyId || !organizationId) {
    return null;
  }

  return {
    apiKeyId,
    organizationId
  };
}
