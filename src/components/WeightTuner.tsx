import React, { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Save, CheckCircle2 } from 'lucide-react';

interface Weights {
  mainStar: number;
  siHua: number;
  minorStar: number;
  globalCoefficient: number;
}

export default function WeightTuner() {
  const [weights, setWeights] = useLocalStorage<Weights>('ziwei_weights', {
    mainStar: 60,
    siHua: 20,
    minorStar: 20,
    globalCoefficient: 0.5
  });
  
  const [localWeights, setLocalWeights] = useState<Weights>(weights);
  const [savedStatus, setSavedStatus] = useState(false);

  const handleSave = () => {
    setWeights(localWeights);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2000);
  };

  const handleChange = (key: keyof Weights, value: number) => {
    setLocalWeights(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-100 tracking-tight">权重模型调参 (Model Tuning)</h2>
          <p className="text-sm text-zinc-400 mt-1">优化 AI 提取“同气”时的算分比例。</p>
        </div>
        <button 
          onClick={handleSave}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          {savedStatus ? <CheckCircle2 size={16} /> : <Save size={16} />}
          {savedStatus ? '已保存' : '保存模型配置'}
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 max-w-3xl">
        <div className="space-y-10">
          
          {/* Main Star Weight */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-zinc-200 uppercase tracking-wider">主星权重</label>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={localWeights.mainStar}
                  onChange={(e) => handleChange('mainStar', Number(e.target.value))}
                  className="w-16 bg-zinc-950 border border-zinc-800 rounded-md px-2 py-1 text-center text-zinc-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-zinc-500 text-sm">%</span>
              </div>
            </div>
            <input 
              type="range" 
              min="0" max="100" 
              value={localWeights.mainStar}
              onChange={(e) => handleChange('mainStar', Number(e.target.value))}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <p className="text-xs text-zinc-500">决定主星在同气计算中的基础得分占比。</p>
          </div>

          {/* Si Hua Weight */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-zinc-200 uppercase tracking-wider">四化权重</label>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={localWeights.siHua}
                  onChange={(e) => handleChange('siHua', Number(e.target.value))}
                  className="w-16 bg-zinc-950 border border-zinc-800 rounded-md px-2 py-1 text-center text-zinc-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-zinc-500 text-sm">%</span>
              </div>
            </div>
            <input 
              type="range" 
              min="0" max="100" 
              value={localWeights.siHua}
              onChange={(e) => handleChange('siHua', Number(e.target.value))}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <p className="text-xs text-zinc-500">决定化禄、化权、化科、化忌的动态影响权重。</p>
          </div>

          {/* Minor Star Weight */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-zinc-200 uppercase tracking-wider">辅星/煞星权重</label>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={localWeights.minorStar}
                  onChange={(e) => handleChange('minorStar', Number(e.target.value))}
                  className="w-16 bg-zinc-950 border border-zinc-800 rounded-md px-2 py-1 text-center text-zinc-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-zinc-500 text-sm">%</span>
              </div>
            </div>
            <input 
              type="range" 
              min="0" max="100" 
              value={localWeights.minorStar}
              onChange={(e) => handleChange('minorStar', Number(e.target.value))}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <p className="text-xs text-zinc-500">决定六吉、六煞等辅星的修正权重。</p>
          </div>

          <div className="h-px bg-zinc-800 my-6"></div>

          {/* Global Coefficient */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-zinc-200 uppercase tracking-wider text-emerald-400">全局底色影响系数</label>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  step="0.1"
                  min="0.1"
                  max="1.0"
                  value={localWeights.globalCoefficient}
                  onChange={(e) => handleChange('globalCoefficient', Number(e.target.value))}
                  className="w-16 bg-zinc-950 border border-zinc-800 rounded-md px-2 py-1 text-center text-emerald-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
            <input 
              type="range" 
              min="0.1" max="1.0" step="0.1"
              value={localWeights.globalCoefficient}
              onChange={(e) => handleChange('globalCoefficient', Number(e.target.value))}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <p className="text-xs text-zinc-500">控制命宫、身宫对全局判断的底色渗透程度 (0.1 - 1.0)。</p>
          </div>

        </div>
      </div>
    </div>
  );
}
