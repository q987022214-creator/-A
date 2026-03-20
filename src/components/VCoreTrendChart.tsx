import React from 'react';
import { getScoreColorTier } from '../utils/vCoreVisualizer';

export interface DecadeTrendData {
  decadeRange: string; // e.g., "15-24"
  score: number;       // 0.1 ~ 1.5
  isCurrent?: boolean; // 是否是当前大限
}

interface VCoreTrendChartProps {
  data: DecadeTrendData[];
  onDecadeClick?: (data: DecadeTrendData) => void;
}

const verticalColorMap = {
  excellent: 'bg-gradient-to-t from-emerald-600 to-emerald-400',
  good: 'bg-gradient-to-t from-blue-600 to-blue-400',
  warning: 'bg-gradient-to-t from-orange-600 to-orange-400',
  danger: 'bg-gradient-to-t from-red-700 to-red-500',
};

export const VCoreTrendChart: React.FC<VCoreTrendChartProps> = ({ data, onDecadeClick }) => {
  return (
    <div className="w-full bg-slate-900/50 rounded-xl p-4 border border-slate-700 backdrop-blur-sm h-64 flex flex-col">
      <h3 className="text-sm font-bold text-slate-200 mb-6">📈 全局运势 K线起伏</h3>
      
      {/* 图表渲染区 */}
      <div className="flex-1 flex items-end justify-between gap-1 relative pl-6 pb-2 border-b border-slate-700">
        
        {/* Y轴参考线 (可选) */}
        <div className="absolute left-0 top-0 bottom-0 w-6 flex flex-col justify-between text-[10px] text-slate-500 pb-2">
          <span>1.5</span>
          <span>1.0</span>
          <span>0.5</span>
        </div>

        {data.map((item, index) => {
          const tier = getScoreColorTier(item.score);
          const heightPercent = Math.max(5, Math.min(100, ((item.score - 0.1) / 1.4) * 100));

          return (
            <div 
              key={index}
              className="relative flex-1 flex flex-col items-center group cursor-pointer"
              onClick={() => onDecadeClick?.(item)}
            >
              {/* 柱子上方悬浮分数 (Hover显示) */}
              <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono text-white bg-slate-800 px-1 py-0.5 rounded shadow-lg">
                {item.score.toFixed(2)}
              </div>

              {/* 柱子本体 */}
              <div 
                className={`w-full max-w-[20px] rounded-t-sm transition-all duration-700 hover:brightness-125 ${verticalColorMap[tier]} ${item.isCurrent ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''}`}
                style={{ height: `${heightPercent}%` }}
              />

              {/* 底部时间区间 */}
              <div className={`absolute -bottom-6 text-[10px] whitespace-nowrap ${item.isCurrent ? 'text-white font-bold' : 'text-slate-400'}`}>
                {item.decadeRange}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
