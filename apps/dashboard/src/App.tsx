type Metric = {
  label: string;
  value: string;
  detail: string;
};

type UsageLog = {
  app: string;
  model: string;
  tokens: string;
  cost: string;
  energy: string;
  co2: string;
  latency: string;
};

const metrics: Metric[] = [
  { label: "Tokens measured", value: "1.42M", detail: "+18.4% this week" },
  { label: "Estimated cost", value: "$6.81", detail: "across 312 requests" },
  { label: "Energy estimate", value: "0.92 kWh", detail: "model-level estimate" },
  { label: "CO2 estimate", value: "51 g", detail: "using regional intensity" },
];

const usageLogs: UsageLog[] = [
  {
    app: "Support copilot",
    model: "gpt-4o-mini",
    tokens: "18,420",
    cost: "$0.11",
    energy: "0.012 kWh",
    co2: "0.7 g",
    latency: "812 ms",
  },
  {
    app: "Sales summarizer",
    model: "gpt-4o",
    tokens: "42,180",
    cost: "$0.89",
    energy: "0.027 kWh",
    co2: "1.5 g",
    latency: "1,240 ms",
  },
  {
    app: "Research agent",
    model: "gpt-4.1",
    tokens: "96,030",
    cost: "$2.34",
    energy: "0.062 kWh",
    co2: "3.5 g",
    latency: "3,410 ms",
  },
  {
    app: "Contract review",
    model: "gpt-4o",
    tokens: "31,760",
    cost: "$0.63",
    energy: "0.021 kWh",
    co2: "1.2 g",
    latency: "1,090 ms",
  },
];

const trendBars = [42, 58, 51, 68, 76, 64, 88, 72, 95, 83, 91, 100];

function App() {
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
            <span>Measured today</span>
            <strong>Live V0 demo</strong>
          </div>
          <div className="large-number">312</div>
          <p>AI requests captured across internal tools</p>
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

      <section className="metrics-grid" aria-label="Summary metrics">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <p>{metric.detail}</p>
          </article>
        ))}
      </section>

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
            <span>Usage trend</span>
            <h2 id="trend-title">Token volume by hour</h2>
          </div>
          <div className="bar-chart" aria-label="Token trend chart">
            {trendBars.map((height, index) => (
              <div className="bar-wrap" key={index}>
                <span style={{ height: `${height}%` }} />
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="table-section" aria-labelledby="events-title">
        <div className="section-heading">
          <span>Recent events</span>
          <h2 id="events-title">Fake V0 usage log</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Application</th>
                <th>Model</th>
                <th>Tokens</th>
                <th>Cost</th>
                <th>Energy</th>
                <th>CO2</th>
                <th>Latency</th>
              </tr>
            </thead>
            <tbody>
              {usageLogs.map((log) => (
                <tr key={`${log.app}-${log.model}`}>
                  <td>{log.app}</td>
                  <td>{log.model}</td>
                  <td>{log.tokens}</td>
                  <td>{log.cost}</td>
                  <td>{log.energy}</td>
                  <td>{log.co2}</td>
                  <td>{log.latency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default App;
