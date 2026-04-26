import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, TrendingDown, Wind, Map, CheckCircle2 } from 'lucide-react';

export default function ControlPanel({ activeState }) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // Only show if there is an active state AND the AI has finished validating a plan
  if (!activeState || !activeState.validated_plan) return null;

  const { route, evaluation } = activeState.validated_plan;

  const handleApprove = async () => {
    setIsExecuting(true);
    try {
      const response = await fetch('http://localhost:3000/api/plan/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worldStateId: activeState.id })
      });
      if (response.ok) setIsDone(true);
    } catch (error) {
      console.error("Execution failed", error);
    }
    setIsExecuting(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-96 bg-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-xl p-5 shadow-[0_0_30px_rgba(16,185,129,0.15)] z-20 pointer-events-auto"
    >
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="w-5 h-5 text-emerald-400" />
        <h3 className="font-sans font-bold text-lg text-white">Validated Recovery Plan</h3>
      </div>

      <div className="bg-white/5 rounded-lg p-4 space-y-3 mb-4 border border-white/10">
        <div className="flex items-start gap-3">
          <Map className="w-4 h-4 text-emerald-400 mt-1" />
          <div>
            <p className="text-xs text-white/50 uppercase tracking-wider font-mono">Optimized Route</p>
            <p className="text-sm text-white/90 font-medium">{route.path_description}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
          <div>
             <p className="text-xs text-white/50 uppercase tracking-wider font-mono">Est. Transit</p>
             <p className="text-lg font-bold text-white">{route.estimated_days} <span className="text-sm font-normal text-white/50">days</span></p>
          </div>
          <div>
             <p className="text-xs text-white/50 uppercase tracking-wider font-mono flex items-center gap-1"><Wind className="w-3 h-3"/> Carbon</p>
             <p className="text-lg font-bold text-amber-400">{route.carbon_kg} <span className="text-sm font-normal text-white/50">kg</span></p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between bg-emerald-950/30 rounded-lg p-3 border border-emerald-500/20 mb-4">
         <span className="text-xs font-mono text-emerald-400/80">AI CONFIDENCE SCORE</span>
         <span className="text-sm font-mono font-bold text-emerald-400">{(evaluation.composite_score * 100).toFixed(0)}%</span>
      </div>

      <AnimatePresence mode="wait">
        {!isDone ? (
          <motion.button 
            key="approve-btn"
            onClick={handleApprove}
            disabled={isExecuting || activeState.execution_status === 'EXECUTED'}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full py-3 rounded-lg font-bold tracking-wide transition-all ${
              activeState.execution_status === 'EXECUTED' 
                ? 'bg-white/10 text-white/50 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
            }`}
          >
            {isExecuting ? 'EXECUTING SMART CONTRACT...' : 'APPROVE & EXECUTE ROUTE'}
          </motion.button>
        ) : (
          <motion.div 
            key="success-msg"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-500/20 text-emerald-400 rounded-lg font-bold border border-emerald-500/50"
          >
            <CheckCircle2 className="w-5 h-5" /> PLAN EXECUTED
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}