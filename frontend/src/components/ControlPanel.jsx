import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Wind, Map, Edit3, Save, Check } from 'lucide-react';

export default function ControlPanel({ activeState }) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDays, setEditDays] = useState('');
  const [editRoute, setEditRoute] = useState('');
  const [editReason, setEditReason] = useState('');

  if (!activeState || !activeState.validated_plan) return null;
  const { route, evaluation } = activeState.validated_plan;

  const handleApprove = async () => {
    setIsExecuting(true);
    const payload = {
        worldStateId: activeState.id,
        overwriteData: isEditing ? {
            isEdited: true,
            estimated_days: editDays || route.estimated_days,
            route_path: editRoute || route.path_description,
            editReason: editReason || 'Operator judgment'
        } : null
    };

    try {
      await fetch('http://localhost:3000/api/plan/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error("Execution failed", error);
    } finally {
      setIsExecuting(false); // ✅ FIX: Never gets stuck on EXECUTING
    }
  };

  const startEditing = () => {
      setIsEditing(!isEditing);
      setEditDays(route.estimated_days);
      setEditRoute(route.path_description);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}
      className="w-96 bg-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-xl p-5 shadow-[0_0_30px_rgba(16,185,129,0.15)] pointer-events-auto"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-sans font-bold text-lg text-white">Validated Plan</h3>
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
            <p className="text-xs text-white/50 uppercase tracking-wider font-mono">Optimized Route</p>
            {isEditing ? (
                 <textarea 
                    value={editRoute} 
                    onChange={(e) => setEditRoute(e.target.value)}
                    className="w-full bg-black/50 border border-blue-500/50 rounded mt-1 px-2 py-1 text-white font-medium focus:outline-none focus:border-blue-400 text-sm h-20"
                 />
            ) : (
                <p className="text-sm text-white/90 font-medium">{route.path_description}</p>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
          <div>
             <p className="text-xs text-white/50 uppercase tracking-wider font-mono">Est. Transit</p>
             {isEditing ? (
                 <input 
                    type="number" 
                    value={editDays} 
                    onChange={(e) => setEditDays(e.target.value)}
                    className="w-full bg-black/50 border border-blue-500/50 rounded mt-1 px-2 py-1 text-white font-bold focus:outline-none focus:border-blue-400"
                 />
             ) : (
                 <p className="text-lg font-bold text-white">{route.estimated_days} <span className="text-sm font-normal text-white/50">days</span></p>
             )}
          </div>
          <div>
             <p className="text-xs text-white/50 uppercase tracking-wider font-mono flex items-center gap-1"><Wind className="w-3 h-3"/> Carbon</p>
             <p className="text-lg font-bold text-amber-400">{route.carbon_kg} <span className="text-sm font-normal text-white/50">kg</span></p>
          </div>
        </div>

        {isEditing && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-2">
                <input 
                    type="text" 
                    placeholder="Reason for manual overwrite..."
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    className="w-full bg-black/50 border border-blue-500/50 rounded px-2 py-2 text-white text-sm focus:outline-none focus:border-blue-400"
                />
            </motion.div>
        )}
      </div>

      <div className="flex gap-2">
          <button 
             onClick={startEditing}
             className={`p-3 rounded-lg border transition-all ${isEditing ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}
          >
             {isEditing ? <Check className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
          </button>

          <button 
            onClick={handleApprove}
            disabled={isExecuting}
            className={`flex-1 py-3 rounded-lg font-bold tracking-wide transition-all flex items-center justify-center gap-2 ${
              isEditing 
                ? 'bg-blue-500 hover:bg-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]' 
                : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
            }`}
          >
            {isExecuting ? 'EXECUTING...' : isEditing ? <><Save className="w-4 h-4"/> OVERWRITE</> : 'APPROVE AS-IS'}
          </button>
      </div>
    </motion.div>
  );
}