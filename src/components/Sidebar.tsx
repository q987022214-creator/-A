import React, { useState } from 'react';
import { Database, GitMerge, Sliders, PlaySquare, Hexagon, MessageSquare, Settings, Brain, Menu, X, FolderOpen } from 'lucide-react';
import ApiSettingsModal from './ApiSettingsModal';

export type TabType = 'chat' | 'memory' | 'fuel' | 'rules' | 'weights' | 'sandbox' | 'cases';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isMobile?: boolean;
}

export default function Sidebar({ activeTab, setActiveTab, isMobile }: SidebarProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const tabs = [
    { id: 'chat', label: '对话', icon: MessageSquare },
    { id: 'cases', label: '命例', icon: FolderOpen },
    { id: 'memory', label: '记忆', icon: Brain },
    { id: 'fuel', label: '断语', icon: Database },
    { id: 'rules', label: '规则', icon: GitMerge },
    { id: 'weights', label: '权重', icon: Sliders },
    { id: 'sandbox', label: '调试', icon: PlaySquare },
  ] as const;

  const sidebarContent = (
    <div className={`w-64 md:w-32 bg-zinc-950 border-r border-zinc-800 flex flex-col h-full shrink-0 z-50 ${isMobile ? 'absolute top-0 left-0' : 'relative'}`}>
        <div className="p-4 flex items-center justify-between border-b border-zinc-800/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20">
              <Hexagon className="text-emerald-500" size={16} />
            </div>
            <h1 className="font-bold text-zinc-100 tracking-tight text-sm">紫微引擎</h1>
          </div>
          {isMobile && <button onClick={() => setIsOpen(false)} className="text-zinc-500"><X size={20} /></button>}
        </div>

        <nav className="flex-1 py-6 px-3 flex flex-col gap-1 items-stretch">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); if(isMobile) setIsOpen(false); }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
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

        <div className="p-4 border-t border-zinc-800/50 flex flex-col gap-4 items-center shrink-0">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all border border-transparent w-full"
          >
            <Settings size={18} className="text-zinc-500" />
            <span>设置</span>
          </button>
        </div>
      </div>
  );

  return (
    <>
      {isMobile ? (
        <>
          <button onClick={() => setIsOpen(true)} className="fixed top-4 left-4 z-40 p-2 bg-zinc-900 rounded-md border border-zinc-700 text-zinc-300">
            <Menu size={20} />
          </button>
          {isOpen && (
            <>
              <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsOpen(false)} />
              {sidebarContent}
            </>
          )}
        </>
      ) : (
        sidebarContent
      )}

      <ApiSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
