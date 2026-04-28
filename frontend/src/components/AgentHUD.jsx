import { useEffect, useState, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, BrainCircuit, Activity, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function AgentHUD({ activeStateId }) {
  const [logs, setLogs] = useState([]);
  const bottomRef = useRef(null);

 useEffect(() => {
    if (!activeStateId) return;

    // Removed the orderBy to avoid Firebase index errors
    const q = query(
      collection(db, 'agent_logs'),
      where('worldStateId', '==', activeStateId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newLogs = [];
      snapshot.forEach((doc) => {
        newLogs.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort locally so disturbance marker appears before planner/critic rounds.
      newLogs.sort((a, b) => {
        const iterA = Number.isFinite(a.iteration) ? a.iteration : 9999;
        const iterB = Number.isFinite(b.iteration) ? b.iteration : 9999;
        if (iterA !== iterB) return iterA - iterB;
        const timeA = a.timestamp?.toMillis?.() || 0;
        const timeB = b.timestamp?.toMillis?.() || 0;
        return timeA - timeB;
      });
      
      setLogs(newLogs);
    });

    return () => unsubscribe();
  }, [activeStateId]);

  // Auto-scroll to bottom as new logs appear
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!activeStateId) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-96 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-4 flex flex-col h-[400px] shadow-2xl z-20 pointer-events-auto"
    >
      <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
        <Terminal className="w-5 h-5 text-emerald-400" />
        <h3 className="font-mono text-sm font-semibold tracking-widest text-white/80">ORCHESTRATOR ROUTES</h3>
      </div>

      <div className="flex-1 overflow-y-auto font-mono text-xs space-y-3 pr-2 custom-scrollbar">
        {logs.length === 0 && (
          <div className="flex items-center gap-2 text-white/40">
            <Activity className="w-4 h-4 animate-spin" /> Waiting for AI Agents...
          </div>
        )}
        
        <AnimatePresence>
          {logs.map((log) => (
            <motion.div 
              key={log.id} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-1"
            >
              {log.type === 'DISTURBANCE_FOUND' && (
                <div className="text-red-300 flex items-start gap-2 mt-1 bg-red-500/10 p-2 rounded border border-red-500/30">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Disturbance Found:</strong>{' '}
                    <span className="text-white/90">{log.disturbance?.reason || 'Unknown reason'}</span>
                    <div className="text-white/60 mt-1">
                      {log.disturbance?.location || 'Unknown location'} · {log.disturbance?.source || 'UNKNOWN'}
                    </div>
                  </div>
                </div>
              )}

              {log.type !== 'DISTURBANCE_FOUND' && (
                <>
              <div className="text-blue-400 flex items-start gap-2">
                <BrainCircuit className="w-3 h-3 mt-0.5 shrink-0" />
                <span><strong className="text-white/80">PLANNER:</strong> Generated {log.routes?.length || 0} candidate routes.</span>
              </div>

              {/* 🌟 NEW: Render Human Overwrites */}
              {log.type === 'HUMAN_OVERWRITE' && (
                  <div className="text-blue-400 flex items-start gap-2 mt-2 bg-blue-500/10 p-2 rounded border border-blue-500/20">
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                        <strong className="text-white">HUMAN OVERRIDE:</strong>
                        <br/>
                        <span className="text-white/80">{log.diff}</span>
                    </div>
                  </div>
              )}
              
              {log.evaluations?.map((evalItem, idx) => (
                <div key={idx} className="pl-5 text-amber-400/90 flex flex-col">
                  <span><strong className="text-white/80">CRITIC:</strong> {evalItem.route_id} {'->'} Score: {evalItem.composite_score}</span>
                  {evalItem.composite_score < 0.85 && evalItem.fatal_flaws && (
                    <span className="text-red-400 pl-2 border-l border-red-500/30 ml-1 mt-1">
                      Flaw: {evalItem.fatal_flaws[0]}
                    </span>
                  )}
                </div>
              ))}
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </motion.div>
  );
}