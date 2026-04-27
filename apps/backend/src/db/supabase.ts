const SUPABASE_REST_PATH = "/rest/v1";

type FetchFunction = typeof fetch;

export type SupabaseInsertOptions = {
  fetchImpl?: FetchFunction;
};

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for Supabase persistence`);
  }

  return value;
}

function buildTableUrl(supabaseUrl: string, tableName: string): URL {
  const url = new URL(supabaseUrl);
  const basePath = url.pathname.replace(/\/+$/, "");

  url.pathname = `${basePath}${SUPABASE_REST_PATH}/${encodeURIComponent(tableName)}`;
  url.search = "";
  url.hash = "";

  return url;
}

async function readErrorBody(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export async function insertSupabaseRows(
  tableName: string,
  rows: Record<string, unknown> | Record<string, unknown>[],
  options: SupabaseInsertOptions = {}
): Promise<void> {
  const supabaseUrl = readRequiredEnv("SUPABASE_URL");
  const serviceRoleKey = readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(buildTableUrl(supabaseUrl, tableName), {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      prefer: "return=minimal"
    },
    body: JSON.stringify(rows)
  });

  if (!response.ok) {
    const errorBody = await readErrorBody(response);
    const detail = errorBody ? `: ${errorBody}` : "";

    throw new Error(
      `Supabase insert into ${tableName} failed with ${response.status} ${response.statusText}${detail}`
    );
  }
}
