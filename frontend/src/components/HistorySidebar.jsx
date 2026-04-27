import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { History, CheckCircle2, X } from 'lucide-react';

export default function HistorySidebar({ isOpen, onClose, onSelectHistory }) {
  const [historyLogs, setHistoryLogs] = useState([]);

  useEffect(() => {
    // Fetch all executed plans (isActive is false)
    const q = query(
        collection(db, 'world_state'), 
        where('isActive', '==', false),
        where('execution_status', '==', 'EXECUTED')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = [];
      snapshot.forEach((doc) => logs.push({ id: doc.id, ...doc.data() }));
      // Sort locally by time
      logs.sort((a, b) => (b.executedAt?.toMillis() || 0) - (a.executedAt?.toMillis() || 0));
      setHistoryLogs(logs);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 h-full w-96 bg-black/95 border-l border-white/10 z-50 p-6 flex flex-col shadow-2xl backdrop-blur-2xl"
        >
          <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 text-white">
                <History className="w-5 h-5 text-emerald-400" />
                <h2 className="font-bold tracking-widest uppercase">Action History</h2>
            </div>
            <button onClick={onClose} className="text-white/50 hover:text-white"><X className="w-6 h-6" /></button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {historyLogs.length === 0 ? (
                  <p className="text-white/40 text-sm italic">No history logged yet.</p>
              ) : (
                  historyLogs.map(log => {
                      const dateObj = log.executedAt ? new Date(log.executedAt.toMillis()) : new Date();
                      const timeString = dateObj.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });

                      return (
                      <div 
                          key={log.id} 
                          onClick={() => onSelectHistory(log)}
                          className="bg-white/5 border border-white/10 rounded-lg p-4 cursor-pointer hover:bg-white/10 transition-all hover:border-emerald-500/50 mb-4"
                      >
                          <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3"/> RESOLVED
                              </span>
                              {log.priority_score && <span className="text-xs font-bold text-white/50">P-{log.priority_score}</span>}
                          </div>
                          
                          <h4 className="text-white font-bold text-sm mb-1">{log.location}</h4>
                          <p className="text-xs text-white/60 mb-2">{log.reason}</p>
                          
                          {/* 🌟 NEW: Timestamp Display */}
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/10">
                              <span className="text-[10px] text-white/40 font-mono tracking-wider">{timeString}</span>
                              <span className="bg-black/50 px-2 py-1 rounded text-[10px] text-white/80 font-mono border border-white/5">
                                  {log.validated_plan?.route?.route_id}
                              </span>
                          </div>
                      </div>
                  )})
              )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}