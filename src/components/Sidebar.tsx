import React, { useState } from 'react';
import { Database, GitMerge, Sliders, PlaySquare, Hexagon, MessageSquare, Settings, Brain } from 'lucide-react';
import ApiSettingsModal from './ApiSettingsModal';

export type TabType = 'chat' | 'memory' | 'fuel' | 'rules' | 'weights' | 'sandbox';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const tabs = [
    { id: 'chat', label: '对话', icon: MessageSquare },
    { id: 'memory', label: '记忆', icon: Brain },
    { id: 'fuel', label: '断语', icon: Database },
    { id: 'rules', label: '规则', icon: GitMerge },
    { id: 'weights', label: '权重', icon: Sliders },
    { id: 'sandbox', label: '调试', icon: PlaySquare },
  ] as const;

  return (
    <>
      <div className="w-32 bg-zinc-950 border-r border-zinc-800 flex flex-col h-full">
        <div className="p-4 flex flex-col items-center justify-center gap-2 border-b border-zinc-800/50 text-center">
          <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20">
            <Hexagon className="text-emerald-500" size={20} />
          </div>
          <div>
            <h1 className="font-bold text-zinc-100 tracking-tight text-xs">紫微引擎</h1>
            <p className="text-[8px] text-zinc-500 uppercase tracking-widest mt-0.5">Admin</p>
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-center gap-2 px-2 py-2.5 rounded-md text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-zinc-800/50 text-emerald-400 border border-zinc-700/50 shadow-sm' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-emerald-500' : 'text-zinc-500'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800/50 flex flex-col gap-4">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-2 py-2.5 rounded-md text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all border border-transparent"
          >
            <Settings size={18} className="text-zinc-500" />
            <span>设置</span>
          </button>

          <div className="bg-zinc-900 rounded-md p-2 border border-zinc-800 flex flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] text-zinc-300 font-mono">Online</span>
            </div>
          </div>
        </div>
      </div>

      <ApiSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
