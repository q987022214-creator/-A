import React, { useState } from 'react';
import Sidebar, { TabType } from './components/Sidebar';
import ChatRoom from './components/ChatRoom';
import MemoryManager from './components/MemoryManager';
import FuelManager from './components/FuelManager';
import RuleEditor from './components/RuleEditor';
import WeightTuner from './components/WeightTuner';
import Sandbox from './components/Sandbox';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('chat');

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-300 font-sans overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 overflow-hidden p-8 bg-zinc-950/50 relative">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="h-full relative z-10">
          {activeTab === 'chat' && <ChatRoom />}
          {activeTab === 'memory' && <MemoryManager />}
          {activeTab === 'fuel' && <FuelManager />}
          {activeTab === 'rules' && <RuleEditor />}
          {activeTab === 'weights' && <WeightTuner />}
          {activeTab === 'sandbox' && <Sandbox />}
        </div>
      </main>
    </div>
  );
}
