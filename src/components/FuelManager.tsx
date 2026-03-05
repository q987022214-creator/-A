import React, { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';

interface Fuel {
  id: string;
  condition: string;
  feedback: string;
  tags: string;
}

export default function FuelManager() {
  const [fuels, setFuels] = useLocalStorage<Fuel[]>('ziwei_fuels', [
    {
      id: '1',
      condition: '交友宫 + 贪狼 + 化忌',
      feedback: '极度消耗精力的无效社交',
      tags: '破财, 烂桃花, 事业阻滞'
    }
  ]);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Omit<Fuel, 'id'>>({
    condition: '',
    feedback: '',
    tags: ''
  });

  const handleAdd = () => {
    if (!formData.condition || !formData.feedback) return;
    const newFuel = {
      id: Date.now().toString(),
      ...formData
    };
    setFuels([...fuels, newFuel]);
    setFormData({ condition: '', feedback: '', tags: '' });
    setIsAdding(false);
  };

  const handleUpdate = () => {
    if (!formData.condition || !formData.feedback) return;
    setFuels(fuels.map(f => f.id === editingId ? { ...formData, id: editingId } : f));
    setEditingId(null);
    setFormData({ condition: '', feedback: '', tags: '' });
  };

  const handleDelete = (id: string) => {
    setFuels(fuels.filter(f => f.id !== id));
  };

  const startEdit = (fuel: Fuel) => {
    setEditingId(fuel.id);
    setFormData({
      condition: fuel.condition,
      feedback: fuel.feedback,
      tags: fuel.tags
    });
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ condition: '', feedback: '', tags: '' });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-100 tracking-tight">燃料库管理 (Knowledge Base)</h2>
          <p className="text-sm text-zinc-400 mt-1">录入“特定星曜组合”对应的“现实反馈/断语”。</p>
        </div>
        {!isAdding && !editingId && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            添加燃料
          </button>
        )}
      </div>

      {(isAdding || editingId) && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 mb-6">
          <h3 className="text-lg font-medium text-zinc-200 mb-4">
            {isAdding ? '添加新燃料' : '编辑燃料'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider">触发条件</label>
              <input 
                type="text" 
                value={formData.condition}
                onChange={e => setFormData({...formData, condition: e.target.value})}
                placeholder="如：交友宫 + 贪狼 + 化忌"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider">现实反馈 / 经验断语</label>
              <textarea 
                value={formData.feedback}
                onChange={e => setFormData({...formData, feedback: e.target.value})}
                placeholder="如：极度消耗精力的无效社交"
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider">标签 (逗号分隔)</label>
              <input 
                type="text" 
                value={formData.tags}
                onChange={e => setFormData({...formData, tags: e.target.value})}
                placeholder="如：破财, 烂桃花, 事业阻滞"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={cancelEdit}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <X size={16} />
                取消
              </button>
              <button 
                onClick={isAdding ? handleAdd : handleUpdate}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <Save size={16} />
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto bg-zinc-900 border border-zinc-800 rounded-lg">
        <table className="w-full text-left text-sm text-zinc-300">
          <thead className="text-xs text-zinc-400 uppercase bg-zinc-950/50 border-b border-zinc-800 sticky top-0">
            <tr>
              <th className="px-4 py-3 font-medium">触发条件</th>
              <th className="px-4 py-3 font-medium">现实反馈 / 断语</th>
              <th className="px-4 py-3 font-medium">标签</th>
              <th className="px-4 py-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {fuels.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  暂无燃料数据，请点击右上角添加。
                </td>
              </tr>
            ) : (
              fuels.map((fuel) => (
                <tr key={fuel.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-emerald-400">{fuel.condition}</td>
                  <td className="px-4 py-3">{fuel.feedback}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {fuel.tags.split(',').map((tag, i) => tag.trim() && (
                        <span key={i} className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs border border-zinc-700">
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => startEdit(fuel)}
                        className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded transition-colors"
                        title="编辑"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(fuel.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
