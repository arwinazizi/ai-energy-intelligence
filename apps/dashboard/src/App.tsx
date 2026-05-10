import { useEffect, useMemo, useState } from "react";
import type { RecentUsageLogsResponseDto, UsageSummaryDto } from "@aei/shared";

type DashboardData = {
  summary: UsageSummaryDto;
  recent: RecentUsageLogsResponseDto;
};

type DashboardState = {
  data: DashboardData | null;
  error: string | null;
  loading: boolean;
};

type Metric = {
  label: string;
  value: string;
  detail: string;
};

type TrendBar = {
  id: string;
  height: number;
};

const DEFAULT_API_BASE_URL = "http://127.0.0.1:4000";

function getApiBaseUrl(): string {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  return (configuredUrl || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

const API_BASE_URL = getApiBaseUrl();
const CLIENT_API_KEY = import.meta.env.VITE_AEI_CLIENT_API_KEY?.trim();

async function fetchJson<T>(path: string, signal: AbortSignal): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json"
  };

  if (CLIENT_API_KEY) {
    headers["x-api-key"] = CLIENT_API_KEY;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    signal
  });

  if (!response.ok) {
    throw new Error(`API request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(value);
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: value > 0 && value < 0.01 ? 6 : 2,
    minimumFractionDigits: value > 0 && value < 0.01 ? 6 : 2,
    style: "currency"
  }).format(value);
}

function formatKwh(value: number): string {
  const maximumFractionDigits = value > 0 && value < 0.01 ? 6 : 3;
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    minimumFractionDigits: value > 0 ? Math.min(3, maximumFractionDigits) : 0
  }).format(value)} kWh`;
}

function formatCo2(value: number): string {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value > 0 && value < 1 ? 3 : 1
  }).format(value)} g`;
}

function formatLatency(value: number | null): string {
  return value === null ? "n/a" : `${formatInteger(value)} ms`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "n/a";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function buildMetrics(summary: UsageSummaryDto | null): Metric[] {
  return [
    {
      label: "Requests measured",
      value: summary ? formatInteger(summary.request_count) : "-",
      detail: "logged through the proxy"
    },
    {
      label: "Tokens measured",
      value: summary ? formatInteger(summary.total_tokens) : "-",
      detail: summary
        ? `${formatInteger(summary.input_tokens)} in / ${formatInteger(summary.output_tokens)} out`
        : "input and output tokens"
    },
    {
      label: "Estimated cost",
      value: summary ? formatUsd(summary.cost_usd) : "-",
      detail: "from V1 model pricing"
    },
    {
      label: "Energy estimate",
      value: summary ? formatKwh(summary.energy_kwh) : "-",
      detail: "token-based estimate"
    },
    {
      label: "CO2 estimate",
      value: summary ? formatCo2(summary.co2_grams) : "-",
      detail: "using V1 carbon intensity"
    }
  ];
}

function App() {
  const [state, setState] = useState<DashboardState>({
    data: null,
    error: null,
    loading: true
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboardData() {
      setState((current) => ({
        ...current,
        error: null,
        loading: true
      }));

      try {
        const [summary, recent] = await Promise.all([
          fetchJson<UsageSummaryDto>("/api/summary", controller.signal),
          fetchJson<RecentUsageLogsResponseDto>("/api/recent", controller.signal)
        ]);

        setState({
          data: { summary, recent },
          error: null,
          loading: false
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : "Failed to load dashboard data",
          loading: false
        }));
      }
    }

    void loadDashboardData();

    return () => {
      controller.abort();
    };
  }, []);

  const summary = state.data?.summary ?? null;
  const recentLogs = state.data?.recent.items ?? [];
  const metrics = useMemo(() => buildMetrics(summary), [summary]);
  const maxRecentTokens = Math.max(1, ...recentLogs.map((log) => log.total_tokens));
  const trendBars: TrendBar[] = state.loading
    ? Array.from({ length: 10 }, (_, index) => ({
        height: 44 + ((index * 13) % 45),
        id: `loading-${index}`
      }))
    : recentLogs.map((log) => ({
        height: Math.max(8, Math.round((log.total_tokens / maxRecentTokens) * 100)),
        id: `${log.created_at}-${log.endpoint}-${log.total_tokens}`
      }));
  const hasNoRows = !state.loading && !state.error && summary?.request_count === 0 && recentLogs.length === 0;

  return (
    <main className="app-shell">
      <section className="hero-section" aria-labelledby="page-title">
        <div className="hero-copy">
          <p className="eyebrow">Proxy-based AI measurement</p>
          <h1 id="page-title">AI Energy Intelligence</h1>
          <p className="hero-text">
            A measurement layer that sits between applications and AI providers,
            turning invisible model calls into auditable usage, cost, energy,
            and CO2 signals.
          </p>
        </div>

        <div className="signal-panel" aria-label="Live measurement summary">
          <div className="panel-header">
            <span>Measured total</span>
            <strong>{state.loading ? "Loading" : "Live V1 data"}</strong>
          </div>
          <div className="large-number">{summary ? formatInteger(summary.request_count) : "-"}</div>
          <p>
            {state.error
              ? "Dashboard data is unavailable."
              : "AI requests captured by the backend usage log."}
          </p>
        </div>
      </section>

      <section className="comparison-section" aria-label="Before and after">
        <div className="comparison-block muted-block">
          <span className="block-label">Before</span>
          <h2>AI calls disappear into provider invoices.</h2>
          <p>
            Teams see aggregate spend after the fact, but not which workflows
            generated tokens, latency, estimated energy, or CO2 impact.
          </p>
        </div>
        <div className="comparison-block strong-block">
          <span className="block-label">After</span>
          <h2>Every request becomes a measurable event.</h2>
          <p>
            The proxy forwards traffic unchanged, extracts usage metadata, and
            exposes a clear operational record for optimization and reporting.
          </p>
        </div>
      </section>

      {state.error ? (
        <section className="status-panel error-panel" aria-live="polite">
          <strong>Unable to load V1 dashboard data.</strong>
          <span>
            Check that the backend is running at {API_BASE_URL}. {state.error}
          </span>
        </section>
      ) : null}

      <section className="metrics-grid" aria-label="Summary metrics" aria-busy={state.loading}>
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <p>{state.loading ? "Loading real usage data..." : metric.detail}</p>
          </article>
        ))}
      </section>

      {hasNoRows ? (
        <section className="status-panel" aria-live="polite">
          <strong>No usage has been logged yet.</strong>
          <span>
            Send a non-streaming OpenAI request through the proxy, then refresh this dashboard.
          </span>
        </section>
      ) : null}

      <section className="workspace-grid">
        <article className="architecture-panel" aria-labelledby="architecture-title">
          <div className="section-heading">
            <span>Architecture</span>
            <h2 id="architecture-title">Client traffic stays intact.</h2>
          </div>
          <div className="flow-diagram" aria-label="Client to proxy to OpenAI to dashboard">
            <div className="flow-node">Client apps</div>
            <div className="flow-arrow" aria-hidden="true" />
            <div className="flow-node primary-node">Express proxy</div>
            <div className="flow-arrow" aria-hidden="true" />
            <div className="flow-node">OpenAI</div>
            <div className="flow-branch" aria-hidden="true" />
            <div className="flow-node secondary-node">Usage log</div>
            <div className="flow-arrow" aria-hidden="true" />
            <div className="flow-node">Dashboard</div>
          </div>
        </article>

        <article className="trend-panel" aria-labelledby="trend-title">
          <div className="section-heading">
            <span>Recent usage</span>
            <h2 id="trend-title">Token volume by request</h2>
          </div>
          <div className="bar-chart" aria-label="Recent token volume chart" aria-busy={state.loading}>
            {trendBars.map((bar) => (
              <div className="bar-wrap" key={bar.id}>
                <span style={{ height: `${bar.height}%` }} />
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="table-section" aria-labelledby="events-title">
        <div className="section-heading">
          <span>Recent events</span>
          <h2 id="events-title">V1 usage log</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Provider</th>
                <th>Endpoint</th>
                <th>Model</th>
                <th>Tokens</th>
                <th>Cost</th>
                <th>Energy</th>
                <th>CO2</th>
                <th>Latency</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {state.loading ? (
                <tr>
                  <td colSpan={10} className="state-cell">
                    Loading recent usage logs...
                  </td>
                </tr>
              ) : null}
              {!state.loading && state.error ? (
                <tr>
                  <td colSpan={10} className="state-cell">
                    Recent usage logs could not be loaded.
                  </td>
                </tr>
              ) : null}
              {!state.loading && !state.error && recentLogs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="state-cell">
                    No recent usage logs are available.
                  </td>
                </tr>
              ) : null}
              {!state.loading && !state.error
                ? recentLogs.map((log) => (
                    <tr key={`${log.created_at}-${log.endpoint}-${log.total_tokens}`}>
                      <td>{log.provider}</td>
                      <td>{log.endpoint}</td>
                      <td>{log.model ?? "n/a"}</td>
                      <td>{formatInteger(log.total_tokens)}</td>
                      <td>{formatUsd(log.cost_usd)}</td>
                      <td>{formatKwh(log.energy_kwh)}</td>
                      <td>{formatCo2(log.co2_grams)}</td>
                      <td>{formatLatency(log.latency_ms)}</td>
                      <td>{log.status_code}</td>
                      <td>{formatDateTime(log.created_at)}</td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default App;
