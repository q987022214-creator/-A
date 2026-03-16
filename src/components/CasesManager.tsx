import React, { useState, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { FolderOpen, Plus, Trash2, Edit2, Check, X, Search, User } from 'lucide-react';

interface Case {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  category?: string;
  notes?: string;
}

const DEFAULT_CATEGORIES = ['未分类', '家人', '朋友', '同学', '同事', '客户', '名人', '其他', '紫占'];

export default function CasesManager() {
  const [cases, setCases] = useLocalStorage<Case[]>('ziwei_cases', []);
  const [categories, setCategories] = useLocalStorage<string[]>('ziwei_case_categories', DEFAULT_CATEGORIES);
  
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryValue, setEditCategoryValue] = useState('');
  
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteValue, setEditNoteValue] = useState('');

  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');

  const handleAddCategory = () => {
    const newCat = `新分类${categories.length + 1}`;
    if (!categories.includes(newCat)) {
      setCategories([...categories, newCat]);
    }
  };

  const handleRenameCategory = (oldName: string) => {
    if (!editCategoryValue.trim() || editCategoryValue === oldName) {
      setEditingCategory(null);
      return;
    }
    if (categories.includes(editCategoryValue)) {
      alert('分类名已存在');
      return;
    }
    
    // Update categories
    const newCategories = categories.map(c => c === oldName ? editCategoryValue : c);
    setCategories(newCategories);
    
    // Update cases with this category
    const newCases = cases.map(c => {
      if (c.category === oldName) {
        return { ...c, category: editCategoryValue };
      }
      return c;
    });
    setCases(newCases);
    
    if (activeCategory === oldName) {
      setActiveCategory(editCategoryValue);
    }
    setEditingCategory(null);
  };

  const handleDeleteCategory = (catName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (catName === '未分类') {
      alert('不能删除默认分类');
      return;
    }
    if (confirm(`确定要删除分类 "${catName}" 吗？该分类下的命盘将被移至"未分类"。`)) {
      setCategories(categories.filter(c => c !== catName));
      const newCases = cases.map(c => {
        if (c.category === catName) {
          return { ...c, category: '未分类' };
        }
        return c;
      });
      setCases(newCases);
      if (activeCategory === catName) {
        setActiveCategory('全部');
      }
    }
  };

  const handleChangeCategory = (caseId: string, newCategory: string) => {
    const newCases = cases.map(c => {
      if (c.id === caseId) {
        return { ...c, category: newCategory };
      }
      return c;
    });
    setCases(newCases);
  };

  const handleDeleteCase = (caseId: string) => {
    if (confirm('确定要删除这个命盘吗？')) {
      setCases(cases.filter(c => c.id !== caseId));
    }
  };

  const handleSaveNote = (caseId: string) => {
    const newCases = cases.map(c => {
      if (c.id === caseId) {
        return { ...c, notes: editNoteValue };
      }
      return c;
    });
    setCases(newCases);
    setEditingNoteId(null);
  };

  const handleSaveName = (caseId: string) => {
    if (!editNameValue.trim()) {
      setEditingNameId(null);
      return;
    }
    const newCases = cases.map(c => {
      if (c.id === caseId) {
        return { ...c, name: editNameValue };
      }
      return c;
    });
    setCases(newCases);
    setEditingNameId(null);
  };

  const parseChartInfo = (content: string) => {
    try {
      let clean = content.trim();
      if (!clean.startsWith('{')) clean = clean.match(/\{[\s\S]*\}/)?.[0] || '{}';
      const data = JSON.parse(clean);
      
      // Handle both iztro native format (data.gender) and imported format (data.astrolabe.gender)
      const astrolabe = data.astrolabe || data;
      
      if (astrolabe && astrolabe.gender) {
        return {
          gender: astrolabe.gender || '-',
          birth: `${astrolabe.solarDate || ''} ${astrolabe.time || ''}`.trim() || '-'
        };
      }
    } catch (e) {
      // ignore
    }
    return { gender: '-', birth: '-' };
  };

  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      const matchCategory = activeCategory === '全部' || (c.category || '未分类') === activeCategory;
      const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (c.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [cases, activeCategory, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-200">
      <div className="p-4 sm:p-6 border-b border-zinc-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
            <FolderOpen className="text-emerald-500" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100 tracking-tight">命例库</h2>
            <p className="text-xs text-zinc-500 mt-0.5">管理和分类您的命盘数据</p>
          </div>
        </div>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <input 
            type="text" 
            placeholder="搜索姓名或备注..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
          />
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        {/* Categories Tab */}
        <div className="px-4 sm:px-6 pt-4 pb-2 border-b border-zinc-800/50 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex gap-2 min-w-max">
            <button
              onClick={() => setActiveCategory('全部')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === '全部' 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800'
              }`}
            >
              全部 ({cases.length})
            </button>
            
            {categories.map(cat => {
              const count = cases.filter(c => (c.category || '未分类') === cat).length;
              const isEditing = editingCategory === cat;
              
              return (
                <div key={cat} className="flex items-center relative group">
                  {isEditing ? (
                    <div className="flex items-center bg-zinc-900 border border-emerald-500/50 rounded-lg overflow-hidden">
                      <input
                        autoFocus
                        type="text"
                        value={editCategoryValue}
                        onChange={e => setEditCategoryValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRenameCategory(cat);
                          if (e.key === 'Escape') setEditingCategory(null);
                        }}
                        className="bg-transparent px-3 py-2 text-sm text-zinc-200 w-24 focus:outline-none"
                      />
                      <button onClick={() => handleRenameCategory(cat)} className="px-2 text-emerald-500 hover:text-emerald-400"><Check size={14} /></button>
                      <button onClick={() => setEditingCategory(null)} className="px-2 text-zinc-500 hover:text-zinc-400"><X size={14} /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveCategory(cat)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                        activeCategory === cat 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800'
                      }`}
                    >
                      <span>{cat}</span>
                      <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded-full">{count}</span>
                      
                      {cat !== '未分类' && (
                        <div className="hidden group-hover:flex items-center gap-1 ml-1">
                          <span 
                            onClick={(e) => { e.stopPropagation(); setEditingCategory(cat); setEditCategoryValue(cat); }}
                            className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200"
                          >
                            <Edit2 size={12} />
                          </span>
                          <span 
                            onClick={(e) => handleDeleteCategory(cat, e)}
                            className="p-1 hover:bg-red-500/20 rounded text-zinc-400 hover:text-red-400"
                          >
                            <Trash2 size={12} />
                          </span>
                        </div>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
            
            <button
              onClick={handleAddCategory}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200 transition-colors flex items-center gap-1"
            >
              <Plus size={16} /> 添加
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {filteredCases.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4">
              <FolderOpen size={48} className="text-zinc-800" />
              <p>该分类下暂无命例</p>
            </div>
          ) : (
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 font-medium">姓名</th>
                      <th className="px-4 py-3 font-medium">性别</th>
                      <th className="px-4 py-3 font-medium">生辰</th>
                      <th className="px-4 py-3 font-medium">分类</th>
                      <th className="px-4 py-3 font-medium w-1/3">备注/断语</th>
                      <th className="px-4 py-3 font-medium text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {filteredCases.map(c => {
                      const info = parseChartInfo(c.content);
                      const isEditingNote = editingNoteId === c.id;
                      const isEditingName = editingNameId === c.id;
                      
                      return (
                        <tr key={c.id} className="hover:bg-zinc-800/30 transition-colors group">
                          <td className="px-4 py-3">
                            {isEditingName ? (
                              <div className="flex items-center gap-1">
                                <input
                                  autoFocus
                                  type="text"
                                  value={editNameValue}
                                  onChange={e => setEditNameValue(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleSaveName(c.id);
                                    if (e.key === 'Escape') setEditingNameId(null);
                                  }}
                                  className="bg-zinc-950 border border-emerald-500/50 rounded px-2 py-1 text-sm text-zinc-200 w-24 focus:outline-none"
                                />
                                <button onClick={() => handleSaveName(c.id)} className="text-emerald-500 hover:text-emerald-400"><Check size={14} /></button>
                                <button onClick={() => setEditingNameId(null)} className="text-zinc-500 hover:text-zinc-400"><X size={14} /></button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-zinc-200">{c.name}</span>
                                <button 
                                  onClick={() => { setEditingNameId(c.id); setEditNameValue(c.name); }}
                                  className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-emerald-400 transition-opacity"
                                >
                                  <Edit2 size={12} />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-400">{info.gender}</td>
                          <td className="px-4 py-3 text-sm text-zinc-400 font-mono">{info.birth}</td>
                          <td className="px-4 py-3">
                            <select
                              value={c.category || '未分类'}
                              onChange={(e) => handleChangeCategory(c.id, e.target.value)}
                              className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500"
                            >
                              {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            {isEditingNote ? (
                              <div className="flex flex-col gap-2">
                                <textarea
                                  autoFocus
                                  value={editNoteValue}
                                  onChange={e => setEditNoteValue(e.target.value)}
                                  className="w-full bg-zinc-950 border border-emerald-500/50 rounded p-2 text-sm text-zinc-200 focus:outline-none min-h-[60px] resize-y"
                                  placeholder="输入备注或断语..."
                                />
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => setEditingNoteId(null)} className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200">取消</button>
                                  <button onClick={() => handleSaveNote(c.id)} className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded">保存</button>
                                </div>
                              </div>
                            ) : (
                              <div 
                                className="text-sm text-zinc-400 cursor-pointer hover:text-zinc-200 hover:bg-zinc-800/50 p-1.5 -ml-1.5 rounded transition-colors min-h-[28px] flex items-center"
                                onClick={() => { setEditingNoteId(c.id); setEditNoteValue(c.notes || ''); }}
                              >
                                {c.notes ? (
                                  <span className="line-clamp-2">{c.notes}</span>
                                ) : (
                                  <span className="text-zinc-600 italic text-xs flex items-center gap-1"><Edit2 size={10} /> 点击添加备注</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button 
                              onClick={() => handleDeleteCase(c.id)}
                              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                              title="删除命例"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
