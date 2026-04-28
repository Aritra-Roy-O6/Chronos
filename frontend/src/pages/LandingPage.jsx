import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '../firebase';
import { getStoredGeminiApiKey, setStoredGeminiApiKey } from '../utils/apiKeyStorage';
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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function LandingPage() {
  const [apiKey, setApiKey] = useState(() => getStoredGeminiApiKey());
  const [status, setStatus] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (window.location.hash === '#api-key-section') {
      const section = document.getElementById('api-key-section');
      section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  async function handleSaveApiKey(event) {
    event.preventDefault();
    setSaving(true);
    setStatus({ type: '', message: '' });

    try {
      const trimmed = apiKey.trim();
      if (!trimmed) {
        throw new Error('Enter a Gemini API key before saving.');
      }

      setStoredGeminiApiKey(trimmed);

      const credential = await signInAnonymously(auth);
      const idToken = await credential.user.getIdToken();

      const response = await fetch(`${API_BASE_URL}/api/config/gemini-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ apiKey: trimmed })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update API key.');
      }

      setStatus({ type: 'success', message: 'Gemini API key saved. New backend LLM calls will use it immediately.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Failed to save API key.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="landing-page">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
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
              <a href="#api-key-section">Add Your Own Gemini API Key</a>
            </nav>
          </header>

          <div className="landing-hero-grid">
            <div className="landing-copy">
              <p className="landing-eyebrow">Proactive Logistics Intelligence</p>
              <h1>Self-healing shipment <em>protection</em></h1>
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

      {/* ── Capabilities ─────────────────────────────────────────────────── */}
      <section className="landing-section">
        <div className="landing-shell">
          <div className="landing-section-heading">
            <div>
              <p className="landing-eyebrow">Why Teams Use CHRONOS</p>
              <h2>Designed for operators who cannot afford reactive logistics.</h2>
            </div>
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

      {/* ── API Key ───────────────────────────────────────────────────────── */}
      <section className="landing-section" id="api-key-section">
        <div className="landing-shell">
          <div className="landing-api-card">
            <div className="landing-api-copy">
              <p className="landing-eyebrow">Runtime LLM Access</p>
              <h2>Update the Gemini key without touching deployment config.</h2>
              <p>
                Save a fresh Gemini API key here when the old one expires. CHRONOS stores it in localStorage for
                convenience and syncs it to backend runtime config so new planning, critic, watchman, and priority calls use it.
              </p>
            </div>

            <form className="landing-api-form" onSubmit={handleSaveApiKey}>
              <label className="landing-api-label" htmlFor="gemini-api-key">
                Gemini API Key
              </label>
              <input
                id="gemini-api-key"
                type="password"
                autoComplete="off"
                placeholder="Paste Gemini API key"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                className="landing-api-input"
              />
              <button type="submit" disabled={saving} className="landing-button landing-button-primary landing-api-button">
                {saving ? 'Saving…' : 'Save API Key'}
              </button>
              {status.message && (
                <p className={`landing-api-status ${status.type === 'error' ? 'landing-api-status-error' : 'landing-api-status-success'}`}>
                  {status.message}
                </p>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="landing-section landing-section-accent">
        <div className="landing-shell">
          <div className="landing-cta">
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
        </div>
      </section>

    </main>
  );
}