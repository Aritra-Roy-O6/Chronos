import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ArrowRight, Activity, MapPin, Anchor, List, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NewShipment() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
      origin: '',
      destination: '',
      stops: '',
      cargo: '',
      priority: 5,
      notes: ''
  });
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const handleStart = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/shipment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
      });

      if (!response.ok) {
        throw new Error('Failed to create shipment');
      }

      await response.json();
      navigate('/command');
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 py-12 overflow-y-auto">
      <motion.form 
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        onSubmit={handleStart}
        className="w-full max-w-xl bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-2xl shadow-2xl mt-10 md:mt-0"
      >
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/10">
            <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400"><Package className="w-6 h-6"/></div>
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Deploy Cargo</h1>
                <p className="text-xs text-white/50 font-mono mt-1">AUTONOMOUS LIFECYCLE ROUTING</p>
            </div>
        </div>

        {/* Route Section */}
        <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-mono text-white/40 uppercase"><MapPin className="w-3 h-3"/> Origin</label>
                <input required placeholder="e.g., Shanghai" value={form.origin} onChange={e => setForm({...form, origin: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none" />
            </div>
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-mono text-white/40 uppercase"><Anchor className="w-3 h-3"/> Destination</label>
                <input required placeholder="e.g., Munich" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none" />
            </div>
        </div>

        {/* Cargo & Stops */}
        <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-mono text-white/40 uppercase"><Package className="w-3 h-3"/> Cargo Description</label>
                <input required placeholder="e.g., 50T Electronics" value={form.cargo} onChange={e => setForm({...form, cargo: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none" />
            </div>
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-mono text-white/40 uppercase"><List className="w-3 h-3"/> Stops (Comma Separated)</label>
                <input placeholder="Singapore, Suez Canal" value={form.stops} onChange={e => setForm({...form, stops: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none" />
            </div>
        </div>

        {/* Priority Slider */}
        <div className="mb-6 bg-black/30 p-4 rounded-xl border border-white/5">
          <label className="flex items-center justify-between text-[10px] font-mono text-white/40 mb-3 uppercase">
            <span className="flex items-center gap-2"><AlertCircle className="w-3 h-3"/> Shipment Priority</span>
            <span className="text-blue-400 font-bold">{form.priority}/10</span>
          </label>
          <input type="range" min="1" max="10" step="1" value={form.priority} onChange={(e) => setForm({...form, priority: Number(e.target.value)})} className="w-full accent-blue-500" />
        </div>

        {/* Optional Notes */}
        <div className="space-y-2 mb-8">
            <label className="text-[10px] font-mono text-white/40 uppercase">Operational Notes (Optional)</label>
            <textarea placeholder="Special handling requirements or constraints..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none h-20 resize-none" />
        </div>

        <button type="submit" disabled={loading} className="w-full bg-blue-500 hover:bg-blue-400 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? <><Activity className="w-4 h-4 animate-spin"/> INITIALIZING ROUTE...</> : <><Package className="w-4 h-4"/> INITIATE AUTONOMOUS TRACKING <ArrowRight className="w-4 h-4"/></>}
        </button>
      </motion.form>
    </div>
  );
}