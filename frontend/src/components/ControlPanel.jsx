import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Wind, Map, Trash2, Plus } from 'lucide-react';

export default function ControlPanel({ activeState }) {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  if (!activeState) return null;
  const route = activeState.validated_plan?.route;
  const originalRouteText = activeState.original_route
    ? activeState.original_route.map((point) => point.label).join(' → ')
    : `${activeState.origin || 'Unknown'} → ${activeState.destination || 'Unknown'}`;


  const handleDelete = async () => {
      if (!activeState?.id) return;
      setIsDeleting(true);
      try {
          await fetch(`${API_BASE_URL}/api/route/delete`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ worldStateId: activeState.id })
          });
      } catch (error) {
          console.error('Delete failed', error);
      } finally {
          setIsDeleting(false);
      }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}
      className="w-96 bg-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-xl p-5 shadow-[0_0_30px_rgba(16,185,129,0.15)] pointer-events-auto"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-sans font-bold text-lg text-white">Route Oversight</h3>
              <p className="text-xs uppercase tracking-wider text-white/50">{route ? 'Reroute Under Review' : 'Original Route Active'}</p>
            </div>
        </div>
        {activeState.priority_score && (
            <div className={`px-2 py-1 rounded text-xs font-bold ${activeState.priority_score >= 8 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                PRIORITY {activeState.priority_score}/10
            </div>
        )}
      </div>

      <div className="bg-white/5 rounded-lg p-4 space-y-3 mb-4 border border-white/10">
        <div className="flex items-start gap-3">
          <Map className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
          <div className="w-full">
            <p className="text-xs text-white/50 uppercase tracking-wider font-mono">Current Route</p>
            <p className="text-sm text-white/90 font-medium">{route ? route.path_description : originalRouteText}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
          <div>
             <p className="text-xs text-white/50 uppercase tracking-wider font-mono">Est. Transit</p>
                 <p className="text-lg font-bold text-white">{route?.estimated_days ?? 'TBD'} <span className="text-sm font-normal text-white/50">days</span></p>
          </div>
          <div>
             <p className="text-xs text-white/50 uppercase tracking-wider font-mono flex items-center gap-1"><Wind className="w-3 h-3"/> Carbon</p>
             <p className="text-lg font-bold text-amber-400">{route?.carbon_kg ?? 'TBD'} <span className="text-sm font-normal text-white/50">kg</span></p>
          </div>
        </div>

      </div>

      <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-all flex items-center justify-center"
          >
            <Trash2 className="w-4 h-4" />
            <span className="ml-2 text-sm font-bold">DELETE ROUTE</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/create')}
            className="flex-1 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-all flex items-center justify-center"
          >
            <Plus className="w-4 h-4" />
            <span className="ml-2 text-sm font-bold">NEW ROUTE</span>
          </button>
      </div>
    </motion.div>
  );
}