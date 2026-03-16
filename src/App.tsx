import React, { useState, useEffect } from 'react';
import Sidebar, { TabType } from './components/Sidebar';
import ChatRoom from './components/ChatRoom';
import MemoryManager from './components/MemoryManager';
import FuelManager from './components/FuelManager';
import RuleEditor from './components/RuleEditor';
import WeightTuner from './components/WeightTuner';
import Sandbox from './components/Sandbox';
import CasesManager from './components/CasesManager';
import { useLocalStorage } from './hooks/useLocalStorage';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [isMobile, setIsMobile] = useState(false);
  const [theme] = useLocalStorage<'dark' | 'light'>('ziwei_theme', 'dark');

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-300 font-sans overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isMobile={isMobile} />
      
      <main className={`flex-1 overflow-hidden p-0 md:p-8 bg-zinc-950/50 relative ${isMobile ? 'pl-16' : ''}`}>
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none hidden md:block"></div>
        
        <div className="h-full relative z-10">
          {activeTab === 'chat' && <ChatRoom />}
          {activeTab === 'cases' && <CasesManager />}
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
