import { Link } from 'react-router-dom';
import './LandingPage.css';

const capabilities = [
  {
    title: 'Autonomous Route Defense',
    body: 'Deploy a shipment once and let CHRONOS monitor the route continuously for strikes, weather shocks, and chokepoints.'
  },
  {
    title: 'Self-Healing Decisions',
    body: 'The platform evaluates alternatives against transit time, cost, and carbon constraints before moving the shipment onto a safer path.'
  },
  {
    title: 'Ground Truth Reporting',
    body: 'Field teams can push disruption reports straight into the system so real-world incidents feed the next monitoring sweep.'
  }
];

const metrics = [
  { value: '24/7', label: 'active route oversight' },
  { value: '<5 min', label: 'disturbance review cadence' },
  { value: 'Sea / Rail / Road', label: 'multimodal rerouting' }
];

export default function LandingPage() {
  return (
    <main className="landing-page">
      <section className="landing-hero">
        <div className="landing-shell">
          <header className="landing-nav">
            <Link to="/" className="landing-brand" aria-label="CHRONOS home">
              CHRONOS
            </Link>
            <nav className="landing-nav-links">
              <Link to="/command">Command Center</Link>
              <Link to="/create">Create Shipment</Link>
              <Link to="/report">Report Incident</Link>
            </nav>
          </header>

          <div className="landing-hero-grid">
            <div className="landing-copy">
              <p className="landing-eyebrow">Proactive Logistics Intelligence</p>
              <h1>Self-healing shipment protection for a volatile world.</h1>
              <p className="landing-subcopy">
                CHRONOS watches every active route, detects disruption signals before cargo hits the bottleneck, and
                reroutes around risk with time and carbon performance built into every decision.
              </p>

              <div className="landing-actions">
                <Link to="/create" className="landing-button landing-button-primary">
                  Launch a Shipment
                </Link>
                <Link to="/report" className="landing-button landing-button-secondary">
                  Report a Disruption
                </Link>
              </div>

              <div className="landing-metrics" aria-label="product highlights">
                {metrics.map((metric) => (
                  <div key={metric.label} className="landing-metric-card">
                    <strong>{metric.value}</strong>
                    <span>{metric.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <aside className="landing-panel">
              <div className="landing-panel-header">
                <span className="landing-panel-kicker">Mission Loop</span>
                <h2>From silent monitoring to autonomous reroute.</h2>
              </div>
              <ol className="landing-timeline">
                <li>
                  <strong>Deploy</strong>
                  <span>Enter origin, destination, cargo profile, and priority. CHRONOS lays down the monitored route.</span>
                </li>
                <li>
                  <strong>Watch</strong>
                  <span>Live signals from reports, weather, and network intelligence are matched against the shipment corridor.</span>
                </li>
                <li>
                  <strong>Adapt</strong>
                  <span>When a disturbance intersects the route, CHRONOS selects a safer path and updates the operating picture.</span>
                </li>
              </ol>
            </aside>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-shell">
          <div className="landing-section-heading">
            <p className="landing-eyebrow">Why Teams Use CHRONOS</p>
            <h2>Designed for operators who cannot afford reactive logistics.</h2>
          </div>
          <div className="landing-capability-grid">
            {capabilities.map((capability) => (
              <article key={capability.title} className="landing-capability-card">
                <h3>{capability.title}</h3>
                <p>{capability.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-accent">
        <div className="landing-shell landing-cta">
          <div>
            <p className="landing-eyebrow">Public Sensor Network</p>
            <h2>See a disruption first? Feed the network immediately.</h2>
            <p>
              The reporting endpoint is built for drivers, port teams, and local operators who can provide real ground truth
              before the news cycle catches up.
            </p>
          </div>
          <div className="landing-cta-actions">
            <Link to="/report" className="landing-button landing-button-primary">
              Open Report Endpoint
            </Link>
            <Link to="/command" className="landing-button landing-button-tertiary">
              View Command Center
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
