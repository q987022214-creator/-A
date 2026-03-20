import React from 'react';
import { getScoreColorTier } from '../utils/vCoreVisualizer';
import { Vector5D } from '../utils/vCoreData';

export interface PalaceScoreData {
  palaceName: string;
  score: number; // 0.1 ~ 1.5
  rawVector?: Vector5D; // 预留给 Phase 3 点击穿透使用
}

interface VCorePalaceBarProps {
  data: PalaceScoreData[];
  onPalaceClick?: (data: PalaceScoreData) => void;
}

const colorMap = {
  excellent: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]',
  good: 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]',
  warning: 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]',
  danger: 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]',
};

export const VCorePalaceBar: React.FC<VCorePalaceBarProps> = ({ data, onPalaceClick }) => {
  // 按照分数从高到低排序
  const sortedData = [...data].sort((a, b) => b.score - a.score);

  return (
    <div className="w-full bg-slate-900/50 rounded-xl p-4 border border-slate-700 backdrop-blur-sm">
      <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center justify-between">
        <span>🌌 十二宫五维战力排行</span>
        <span className="text-xs text-slate-500 font-normal">点击条目查看深度解析</span>
      </h3>
      
      <div className="space-y-3">
        {sortedData.map((item) => {
          const tier = getScoreColorTier(item.score);
          // 计算百分比宽度，0.1分对应 0%，1.5分对应 100%
          const widthPercent = Math.max(0, Math.min(100, ((item.score - 0.1) / 1.4) * 100));

          return (
            <div 
              key={item.palaceName} 
              className="group relative flex items-center cursor-pointer transition-all hover:bg-slate-800/50 p-1 rounded"
              onClick={() => onPalaceClick?.(item)}
            >
              {/* 宫位名称 */}
              <div className="w-16 shrink-0 text-xs text-slate-300 font-medium z-10">
                {item.palaceName}
              </div>
              
              {/* 柱状图主干 */}
              <div className="flex-1 h-5 bg-slate-800 rounded-full overflow-hidden relative border border-slate-700/50">
                <div 
                  className={`h-full transition-all duration-700 ease-out rounded-full ${colorMap[tier]}`}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
              
              {/* 分数数值 */}
              <div className="w-10 shrink-0 text-right text-xs font-mono font-bold ml-2 z-10" 
                   style={{ color: tier === 'danger' ? '#ef4444' : tier === 'excellent' ? '#10b981' : '#cbd5e1' }}>
                {item.score.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
