import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'framer-motion';
import { CheckCircle2, Activity, Map, Wind, ArrowLeft } from 'lucide-react';

export default function TrackingPage() {
  const { id } = useParams();
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    // Listen strictly for this specific user's tracking ID
    const q = query(collection(db, 'world_state'), where('tracking_id', '==', id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setReportData({ docId: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      }
    });
    return () => unsubscribe();
  }, [id]);

  if (!reportData) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono animate-pulse">LOCATING SIGNAL...</div>;
  }

  // Determine active steps based on backend status
  const s = reportData.status;
  const isAnalyzing = s === 'PROCESSING' || s === 'PLAN_READY' || reportData.execution_status === 'EXECUTED';
  const isValidated = s === 'PLAN_READY' || reportData.execution_status === 'EXECUTED';
  const isExecuted = reportData.execution_status === 'EXECUTED';

  return (
    <div className="min-h-screen bg-black flex flex-col items-center p-6 md:justify-center">
      <div className="w-full max-w-md">
        
        <Link to="/report" className="flex items-center gap-2 text-white/50 hover:text-white mb-8 transition-colors text-sm font-bold">
            <ArrowLeft className="w-4 h-4"/> BACK TO REPORT
        </Link>

        <h1 className="text-3xl font-bold tracking-tighter text-white">INCIDENT TRACKER</h1>
        <div className="flex justify-between items-center mt-2 pb-6 border-b border-white/10">
             <p className="text-white/50 text-sm">ID: <span className="text-white font-mono">{id}</span></p>
             {reportData.priority_score && (
                 <span className={`px-2 py-1 rounded text-xs font-bold ${reportData.priority_score >= 8 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    PRIORITY {reportData.priority_score}/10
                 </span>
             )}
        </div>

        {/* The Live Stepper */}
        <div className="mt-8 space-y-8 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-emerald-500 before:to-white/10">
          
          <Step active={true} icon={<CheckCircle2 />} title="Incident Logged" desc={`Report received for ${reportData.location}.`} />
          <Step active={isAnalyzing} icon={<Activity className={!isValidated ? 'animate-spin' : ''}/>} title="AI Analysis & Geocoding" desc="Calculating global impact and fetching GPS coordinates." />
          <Step active={isValidated} icon={<CheckCircle2 />} title="Solution Validated" desc="CHRONOS has prepared an optimized reroute automatically." />
          <Step active={isExecuted} icon={<CheckCircle2 />} title="Reroute Applied" desc="Carriers notified and impacted logistics rerouted." />

        </div>

        {/* The Final Result Card (Appears when validated or executed) */}
        {isValidated && reportData.validated_plan && (
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-10 bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-5 backdrop-blur-xl">
                 <h3 className="font-bold text-emerald-400 mb-4 flex items-center gap-2"><Map className="w-4 h-4"/> VALIDATED ROUTE</h3>
                 <p className="text-white/90 text-sm font-medium mb-4">{reportData.validated_plan.route.path_description}</p>
                 <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-3">
                     <div>
                         <p className="text-xs text-white/50 font-mono">EST. TRANSIT</p>
                         <p className="text-white font-bold">{reportData.validated_plan.route.estimated_days} Days</p>
                     </div>
                     <div className="text-right">
                         <p className="text-xs text-white/50 font-mono flex items-center gap-1 justify-end"><Wind className="w-3 h-3"/> CARBON</p>
                         <p className="text-amber-400 font-bold">{reportData.validated_plan.route.carbon_kg} kg</p>
                     </div>
                 </div>
                 {!isExecuted && (
                     <p className="text-xs text-white/40 mt-3">CHRONOS has validated this route and will continue monitoring for new disruptions.</p>
                 )}
             </motion.div>
        )}

      </div>
    </div>
  );
}

// Small UI component for the stepper
function Step({ active, icon, title, desc }) {
  return (
    <div className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group ${active ? 'opacity-100' : 'opacity-40 grayscale'}`}>
      <div className={`flex items-center justify-center w-6 h-6 rounded-full border-2 bg-black shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow transition-colors ${active ? 'border-emerald-500 text-emerald-500' : 'border-white/30 text-white/30'}`}>
        {icon}
      </div>
      <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
        <h4 className="font-bold text-white text-sm">{title}</h4>
        <p className="text-xs text-white/60 mt-1">{desc}</p>
      </div>
    </div>
  );
}