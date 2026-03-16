import React, { useState } from 'react';
import { Brain, Plus, Trash2, Edit2, Check, X, Database, User, MessageSquare } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';

export type ChartMemory = {
  chartId: string;
  chartName: string;
  aiSummary: string[];
  validatedFacts: string[];
  userInfo: string[];
};

interface Case {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  category?: string;
  notes?: string;
}

export default function MemoryManager() {
  const [memories, setMemories] = useLocalStorage<ChartMemory[]>('ziwei_memories', []);
  const [cases] = useLocalStorage<Case[]>('ziwei_cases', []);
  const [selectedChartId, setSelectedChartId] = useState<string | null>(null);

  const [editingItem, setEditingItem] = useState<{ type: keyof Omit<ChartMemory, 'chartId' | 'chartName'>, index: number } | null>(null);
  const [editValue, setEditValue] = useState('');

  const selectedMemory = memories.find(m => m.chartId === selectedChartId);

  // Initialize memory for all cases that don't have one
  const handleSyncCases = () => {
    const newMemories = [...memories];
    let added = 0;
    cases.forEach(c => {
      if (!newMemories.find(m => m.chartId === c.id)) {
        newMemories.push({
          chartId: c.id,
          chartName: c.name,
          aiSummary: [],
          validatedFacts: [],
          userInfo: []
        });
        added++;
      }
    });
    if (added > 0) {
      setMemories(newMemories);
    }
  };

  const handleAddItem = (type: keyof Omit<ChartMemory, 'chartId' | 'chartName'>) => {
    if (!selectedChartId) return;
    const newMemories = memories.map(m => {
      if (m.chartId === selectedChartId) {
        return { ...m, [type]: [...m[type], '新记忆条目...'] };
      }
      return m;
    });
    setMemories(newMemories);
    setEditingItem({ type, index: newMemories.find(m => m.chartId === selectedChartId)![type].length - 1 });
    setEditValue('新记忆条目...');
  };

  const handleSaveEdit = () => {
    if (!selectedChartId || !editingItem) return;
    const newMemories = memories.map(m => {
      if (m.chartId === selectedChartId) {
        const newList = [...m[editingItem.type]];
        newList[editingItem.index] = editValue;
        return { ...m, [editingItem.type]: newList };
      }
      return m;
    });
    setMemories(newMemories);
    setEditingItem(null);
  };

  const handleDeleteItem = (type: keyof Omit<ChartMemory, 'chartId' | 'chartName'>, index: number) => {
    if (!selectedChartId) return;
    const newMemories = memories.map(m => {
      if (m.chartId === selectedChartId) {
        const newList = [...m[type]];
        newList.splice(index, 1);
        return { ...m, [type]: newList };
      }
      return m;
    });
    setMemories(newMemories);
  };

  const handleDeleteMemory = (chartId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除该命盘的所有记忆吗？')) {
      setMemories(memories.filter(m => m.chartId !== chartId));
      if (selectedChartId === chartId) setSelectedChartId(null);
    }
  };

  const renderMemorySection = (
    title: string, 
    type: keyof Omit<ChartMemory, 'chartId' | 'chartName'>, 
    icon: React.ReactNode, 
    description: string,
    colorClass: string
  ) => {
    if (!selectedMemory) return null;
    const items = selectedMemory[type];

    return (
      <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-md ${colorClass} bg-opacity-10`}>
              {icon}
            </div>
            <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
          </div>
          <button 
            onClick={() => handleAddItem(type)}
            className="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 rounded-md transition-colors"
            title="添加条目"
          >
            <Plus size={16} />
          </button>
        </div>
        <p className="text-xs text-zinc-500 mb-4">{description}</p>

        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="text-center py-6 text-zinc-600 text-xs border border-dashed border-zinc-800 rounded-lg">
              暂无记录
            </div>
          ) : (
            items.map((item, index) => (
              <div key={index} className="group flex items-start gap-3 bg-zinc-900 border border-zinc-800/80 p-3 rounded-lg hover:border-zinc-700 transition-colors">
                {editingItem?.type === type && editingItem.index === index ? (
                  <div className="flex-1 flex gap-2">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 bg-zinc-950 border border-emerald-500/50 rounded-md p-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 min-h-[60px] resize-y"
                      autoFocus
                    />
                    <div className="flex flex-col gap-1">
                      <button onClick={handleSaveEdit} className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditingItem(null)} className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 text-sm text-zinc-300 whitespace-pre-wrap">{item}</div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingItem({ type, index });
                          setEditValue(item);
                        }}
                        className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 rounded-md"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteItem(type, index)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-md"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      {/* Left Panel: Memory List */}
      <div className="w-80 border-r border-zinc-800 flex flex-col bg-zinc-950/30">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-200 flex items-center gap-2">
            <Brain size={16} className="text-emerald-500" />
            记忆库列表
          </h2>
          <button 
            onClick={handleSyncCases}
            className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center gap-1 px-2 py-1 bg-emerald-500/10 rounded-md"
          >
            <Database size={12} />
            同步命盘
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {memories.length === 0 ? (
            <div className="text-center py-10 text-zinc-600 text-xs">
              暂无记忆，请点击右上角同步命盘
            </div>
          ) : (
            memories.map(memory => (
              <button
                key={memory.chartId}
                onClick={() => setSelectedChartId(memory.chartId)}
                className={`w-full text-left px-3 py-3 rounded-lg flex items-center justify-between group transition-colors ${
                  selectedChartId === memory.chartId 
                    ? 'bg-zinc-800 border border-zinc-700' 
                    : 'hover:bg-zinc-900 border border-transparent'
                }`}
              >
                <div className="truncate pr-2">
                  <div className={`text-sm font-medium truncate ${selectedChartId === memory.chartId ? 'text-emerald-400' : 'text-zinc-300'}`}>
                    {memory.chartName}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1 flex gap-2">
                    <span>总结: {memory.aiSummary.length}</span>
                    <span>断语: {memory.validatedFacts.length}</span>
                    <span>信息: {memory.userInfo.length}</span>
                  </div>
                </div>
                <div 
                  onClick={(e) => handleDeleteMemory(memory.chartId, e)}
                  className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Panel: Memory Details */}
      <div className="flex-1 flex flex-col bg-zinc-900 overflow-hidden">
        {selectedMemory ? (
          <>
            <div className="p-6 border-b border-zinc-800 bg-zinc-950/50">
              <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">{selectedMemory.chartName}</h2>
              <p className="text-sm text-zinc-500 mt-1">专属长效上下文记忆，用于提升 AI 针对该命盘的推理准确率。</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {renderMemorySection(
                "AI 总结 (AI Summary)", 
                "aiSummary", 
                <Brain size={16} className="text-purple-400" />, 
                "AI对格局、性格、处理问题方式的精炼总结",
                "text-purple-400"
              )}
              {renderMemorySection(
                "已验证断语 (Validated Facts)", 
                "validatedFacts", 
                <Check size={16} className="text-emerald-400" />, 
                "用户反馈“算的对”的断语记录",
                "text-emerald-400"
              )}
              {renderMemorySection(
                "用户现实信息 (User Info)", 
                "userInfo", 
                <User size={16} className="text-blue-400" />, 
                "用户袒露的个人现实信息（如父母、婚姻状况等）",
                "text-blue-400"
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500">
            <Brain size={48} className="mb-4 opacity-20" />
            <p>请在左侧选择一个命盘查看其专属记忆</p>
          </div>
        )}
      </div>
    </div>
  );
}
