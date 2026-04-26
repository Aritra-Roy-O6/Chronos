import { useState } from 'react'
import GlobeView from './components/GlobeView'
import AgentHUD from './components/AgentHUD'
import ControlPanel from './components/ControlPanel'

function App() {
  const [activeState, setActiveState] = useState(null);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white font-sans">
      
      {/* Layer 1: The 3D Interactive Globe */}
      <GlobeView onStateChange={setActiveState} />

      {/* Layer 2: The Header */}
      <header className="absolute top-0 left-0 w-full p-6 z-10 pointer-events-none flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter text-white drop-shadow-md">CHRONOS</h1>
          <p className="text-emerald-400 font-mono text-sm mt-1 tracking-widest uppercase shadow-black drop-shadow-lg">
            Autonomous Supply Chain Orchestrator
          </p>
        </div>
        
        <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-mono text-white/80">SENTINEL AGENT ACTIVE</span>
        </div>
      </header>

      {/* Layer 3: HUD and Controls */}
      <div className="absolute inset-0 pointer-events-none p-6 flex justify-between items-end pb-12">
        
        {/* Left side: The AI Terminal */}
        <AgentHUD activeStateId={activeState?.id} /> 
        
        {/* Right side: The Human Approval Gate */}
        <ControlPanel activeState={activeState} />
        
      </div>

    </div>
  )
}

export default App