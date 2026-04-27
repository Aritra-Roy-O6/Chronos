import { useState } from 'react'
import GlobeView from './components/GlobeView'
import AgentHUD from './components/AgentHUD'
import ControlPanel from './components/ControlPanel'
import HistorySidebar from './components/HistorySidebar'
import { History } from 'lucide-react'

function App() {
  const [activeState, setActiveState] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historicalFocus, setHistoricalFocus] = useState(null);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white font-sans">
      
      <GlobeView onStateChange={setActiveState} historicalFocus={historicalFocus} />

      {/* Header */}
      <header className="absolute top-0 left-0 w-full p-6 z-10 flex justify-between items-start pointer-events-auto">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter text-white drop-shadow-md">CHRONOS</h1>
          <p className="text-emerald-400 font-mono text-sm mt-1 tracking-widest uppercase shadow-black drop-shadow-lg">
            Autonomous Supply Chain Orchestrator
          </p>
        </div>
        
        <div className="flex gap-4">
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-mono text-white/80">SENTINEL AGENT ACTIVE</span>
            </div>
            
            {/* 🌟 NEW: History Toggle Button */}
            <button 
                onClick={() => setIsHistoryOpen(true)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 transition-all text-sm font-bold text-white/90"
            >
                <History className="w-4 h-4" /> LOGS
            </button>
        </div>
      </header>

      {/* Main UI */}
      <div className="absolute inset-0 pointer-events-none p-6 flex justify-between items-end pb-12">
        <AgentHUD activeStateId={activeState?.id} /> 
        <ControlPanel activeState={activeState} />
      </div>

      {/* 🌟 NEW: History Sidebar */}
      <HistorySidebar 
          isOpen={isHistoryOpen} 
          onClose={() => setIsHistoryOpen(false)} 
          onSelectHistory={(log) => setHistoricalFocus(log)} 
      />

    </div>
  )
}

export default App