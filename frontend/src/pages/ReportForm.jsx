import { useState } from 'react';
import { AlertTriangle, Send, MapPin, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const PORTS = [
  "Port of Rotterdam, Netherlands",
  "Singapore",
  "Los Angeles",
  "Port of Shanghai, China",
  "Port of Hamburg, Germany"
];

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function ReportForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({
    location: PORTS[0],
    reason: '',
    disruption_level: 0.5,
    duration_hours: 24
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 🌟 NEW: Send to our secure backend API instead of Firebase directly
      const response = await fetch(`${API_BASE_URL}/api/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              location: formData.location,
              reason: formData.reason,
              disruption_level: parseFloat(formData.disruption_level),
              duration_hours: parseFloat(formData.duration_hours)
          })
      });

      if (!response.ok) throw new Error("Backend rejected report.");

      setSubmitted(true);
      setErrorMessage('');
    } catch (error) {
      console.error("Failed to submit report:", error);
      setErrorMessage('Failed to send report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center p-6 md:justify-center overflow-y-auto">
      
      {/* Mobile-Friendly Header */}
      <div className="w-full max-w-md mb-8 mt-4 md:mt-0">
        <h1 className="text-3xl font-bold tracking-tighter text-white">CHRONOS</h1>
        <p className="text-emerald-400 font-mono text-xs mt-1 tracking-widest uppercase">
          Field Sentinel Reporting
        </p>
      </div>

      <motion.form 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/10">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold">Log New Disruption</h2>
        </div>
        {submitted && (
          <div className="mb-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-sm text-emerald-200">
            ✅ Disruption logged. CHRONOS is analyzing affected routes and executing autonomous reroutes.
          </div>
        )}
        {errorMessage && (
          <div className="mb-5 rounded-2xl bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        {/* Location Input (Free Text with Suggestions) */}
        <div className="mb-5">
          <label className="flex items-center gap-2 text-xs font-mono text-white/50 mb-2 uppercase">
            <MapPin className="w-3 h-3" /> Affected Port / Node
          </label>
          <input 
            type="text"
            list="port-suggestions"
            placeholder="e.g., Suez Canal, Egypt"
            required
            disabled={submitted}
            value={formData.location}
            onChange={(e) => setFormData({...formData, location: e.target.value})}
            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <datalist id="port-suggestions">
            <option value="Port of Rotterdam, Netherlands" />
            <option value="Singapore" />
            <option value="Panama Canal" />
            <option value="Suez Canal, Egypt" />
            <option value="Port of Los Angeles, USA" />
          </datalist>
        </div>

        {/* Description Textarea */}
        <div className="mb-5">
          <label className="block text-xs font-mono text-white/50 mb-2 uppercase">Disruption Details</label>
          <textarea 
            required
            disabled={submitted}
            placeholder="e.g., Dock workers union strike blockading Terminal C..."
            value={formData.reason}
            onChange={(e) => setFormData({...formData, reason: e.target.value})}
            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500 transition-colors h-28 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Severity Slider */}
        <div className="mb-8">
          <label className="flex items-center justify-between text-xs font-mono text-white/50 mb-2 uppercase">
            <span className="flex items-center gap-2"><Activity className="w-3 h-3"/> Estimated Severity</span>
            <span className="text-emerald-400 font-bold">{formData.disruption_level * 10}/10</span>
          </label>
          <input 
            type="range" min="0.1" max="1.0" step="0.1"
            disabled={submitted}
            value={formData.disruption_level}
            onChange={(e) => setFormData({...formData, disruption_level: e.target.value})}
            className="w-full accent-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="flex justify-between text-[10px] text-white/30 mt-1 uppercase">
            <span>Minor Delay</span>
            <span>Total Shutdown</span>
          </div>
        </div>

        <div className="mb-8">
          <label className="flex items-center justify-between text-xs font-mono text-white/50 mb-2 uppercase">
            <span>Expected Duration</span>
            <span className="text-emerald-400 font-bold">{formData.duration_hours}h</span>
          </label>
          <input
            type="range" min="1" max="168" step="1"
            disabled={submitted}
            value={formData.duration_hours}
            onChange={(e) => setFormData({ ...formData, duration_hours: Number(e.target.value) })}
            className="w-full accent-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="flex justify-between text-[10px] text-white/30 mt-1 uppercase">
            <span>1 Hour</span>
            <span>7 Days</span>
          </div>
        </div>

        {/* Submit Button */}
        <button 
          type="submit" disabled={isSubmitting || submitted}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? <><Activity className="w-4 h-4 animate-spin"/> TRANSMITTING...</> : submitted ? <><AlertTriangle className="w-4 h-4"/> REPORT LOGGED</> : <><Send className="w-4 h-4"/> SUBMIT REPORT</>}
        </button>
        {submitted && (
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setErrorMessage('');
              setFormData({ location: PORTS[0], reason: '', disruption_level: 0.5, duration_hours: 24 });
            }}
            className="w-full mt-3 bg-white/5 hover:bg-white/10 border border-white/20 text-white font-bold py-3 rounded-xl transition-all"
          >
            LOG ANOTHER REPORT
          </button>
        )}
      </motion.form>
    </div>
  );
}
