import React, { useState, useMemo } from 'react';
import { getScoreColorTier } from '../utils/vCoreVisualizer';

// ----------------- 类型定义 -----------------
export interface PalaceScore {
  name: string;
  score: number;
  vector: any;
}

export interface YearlyTrend {
  age: number;
  ygs: number;
  label: string;
}

export interface DecadeData {
  range: string;       // e.g., "15-24"
  branch: string;      // 地支
  dgs: number;         // 大限全局综合分
  palaces: PalaceScore[]; // 该大限下12宫的PEI排名
  yearlyTrends: YearlyTrend[]; // 该大限的流年走势
}

interface Props {
  data: DecadeData[];
  onPalaceClick?: (palace: PalaceScore, decadeRange: string) => void;
}

// ----------------- 颜色配置映射 -----------------
const colorMap = {
  excellent: { bar: 'bg-emerald-500', line: '#10b981', text: 'text-emerald-400' },
  good: { bar: 'bg-blue-500', line: '#3b82f6', text: 'text-blue-400' },
  warning: { bar: 'bg-amber-500', line: '#f59e0b', text: 'text-amber-400' },
  danger: { bar: 'bg-rose-500', line: '#f43f5e', text: 'text-rose-400' },
};

export const VCoreTrendChart: React.FC<Props> = ({ data, onPalaceClick }) => {
  // 视图模式：'decade' (大限) | 'year' (流年)
  const [viewMode, setViewMode] = useState<'decade' | 'year'>('decade');
  // 当前选中的大限索引 (用于展示内联面板)
  const [selectedDecadeIdx, setSelectedDecadeIdx] = useState<number | null>(null);
  // 当进入流年模式时，目标大限的索引
  const [targetDecadeForYearly, setTargetDecadeForYearly] = useState<number>(0);

  // ----------------- 核心数据提取与缩放 -----------------
  const isDecadeMode = viewMode === 'decade';
  const currentArray = isDecadeMode 
    ? data 
    : (data[targetDecadeForYearly]?.yearlyTrends || []);

  // 生成 SVG 折线路径 (0.1 ~ 1.5 的范围映射到 100 ~ 0 的 Y 轴坐标)
  const svgPoints = useMemo(() => {
    return currentArray.map((item: any, i: number) => {
      const score = isDecadeMode ? item.dgs : item.ygs;
      const x = (i / (currentArray.length - 1 || 1)) * 1000; // 撑满 1000 宽度的 viewBox
      const y = 100 - ((score - 0.1) / 1.4) * 100; // 将 0.1-1.5 映射到 0-100%，Y轴翻转
      return `${x},${y}`;
    }).join(' ');
  }, [currentArray, isDecadeMode]);

  if (!data || data.length === 0) return null;

  const activeDetail = selectedDecadeIdx !== null ? data[selectedDecadeIdx] : null;

  return (
    <div className="bg-zinc-950/80 backdrop-blur-md border border-zinc-800/60 rounded-xl p-4 md:p-5 w-full shadow-2xl transition-all duration-300">
      
      {/* 🎛️ 顶部控制栏 */}
      <div className="flex justify-between items-center mb-6 border-b border-zinc-800/60 pb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-zinc-100 font-bold text-sm flex items-center gap-2 tracking-wide">
            <span className={`w-2 h-2 rounded-full ${isDecadeMode ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'}`}></span>
            {isDecadeMode ? '人生大运起伏 (DGS)' : `${data[targetDecadeForYearly].range}岁 流年推演 (YGS)`}
          </h3>
          {!isDecadeMode && (
            <button 
              onClick={() => { setViewMode('decade'); setSelectedDecadeIdx(null); }} 
              className="text-[10px] font-bold bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1 rounded transition-colors border border-zinc-700"
            >
              🔙 返回大运盘
            </button>
          )}
        </div>
      </div>

      {/* 🚀 核心图表区 (折柱分离，高度极限压缩) */}
      <div className="relative h-48 w-full flex items-end justify-between px-2 bg-zinc-900/30 rounded-lg border border-zinc-800/40 pt-4 mb-2">
        
        {/* 🟡 独立图层：SVG 趋势折线 */}
        <svg viewBox="0 -10 1000 120" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible opacity-80">
          <polyline 
            points={svgPoints} 
            fill="none" 
            stroke={isDecadeMode ? '#f59e0b' : '#3b82f6'} // 大运用橙黄，流年用科技蓝
            strokeWidth="3" 
            vectorEffect="non-scaling-stroke" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        </svg>

        {/* 辅助基准线 */}
        <div className="absolute left-0 right-0 top-[50%] border-t border-zinc-700/40 border-dashed w-full z-0"></div>

        {/* 柱状图与交互区 */}
        <div className="absolute inset-0 w-full h-full flex justify-between z-20 pointer-events-none px-2">
          {currentArray.map((item: any, idx: number) => {
            const score = isDecadeMode ? item.dgs : item.ygs;
            const label = isDecadeMode ? item.range : `${item.age}岁`;
            const tier = getScoreColorTier(score);
            const barHeight = Math.max(5, ((score - 0.1) / 1.4) * 100); // 0.1~1.5 -> 5%~100%
            const isSelected = selectedDecadeIdx === idx;
            
            // 计算圆点在 Y 轴的位置
            const lineY = 100 - ((score - 0.1) / 1.4) * 100; 

            return (
              <div 
                key={idx} 
                onClick={() => isDecadeMode && setSelectedDecadeIdx(isSelected ? null : idx)} 
                className={`relative flex flex-col items-center flex-1 h-full group ${isDecadeMode ? 'cursor-pointer pointer-events-auto' : ''}`}
              >
                {/* 交互高亮背景 */}
                <div className={`absolute inset-0 w-[80%] mx-auto h-full rounded transition-colors z-0 ${isSelected ? 'bg-zinc-800/50' : 'hover:bg-zinc-800/30'}`}></div>

                {/* 折线图上的节点光晕 */}
                <div 
                  className={`absolute w-2.5 h-2.5 bg-zinc-950 border-2 rounded-full z-30 transition-transform ${isSelected ? 'scale-150 border-white' : `border-[${colorMap[tier].line}] group-hover:scale-125`}`} 
                  style={{ top: `calc(${lineY}% - 5px)` }}
                />

                {/* 悬浮分数提示 */}
                <div className={`absolute text-[10px] font-mono font-bold z-40 opacity-0 group-hover:opacity-100 transition-opacity ${colorMap[tier].text}`}
                     style={{ top: `calc(${lineY}% - 24px)` }}>
                  {score.toFixed(2)}
                </div>

                {/* 柱体主干 */}
                <div 
                  className={`absolute bottom-0 w-full max-w-[14px] rounded-t-sm transition-all duration-500 z-10 opacity-70 group-hover:opacity-100 ${colorMap[tier].bar} ${isSelected ? 'brightness-125 ring-1 ring-white/50' : ''}`} 
                  style={{ height: `${barHeight}%` }}
                />

                {/* 底部 X 轴标签 */}
                <div className={`absolute top-[100%] mt-2 text-[10px] text-center leading-tight transition-colors z-20 whitespace-nowrap ${isSelected ? 'text-zinc-100 font-bold' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                  {label}
                  {isDecadeMode && <span className="block text-[8px] opacity-50 font-mono mt-0.5">{item.branch}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 🗂️ 大限内联展开面板 (取代原本独立的 VCorePalaceBar) */}
      {isDecadeMode && activeDetail && (
        <div className="mt-10 pt-4 border-t border-zinc-800/60 animate-in slide-in-from-top-4 fade-in duration-300">
          
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-zinc-200 font-bold text-sm flex items-center gap-2">
              <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-xs border border-amber-500/30">
                {activeDetail.range}岁
              </span>
              大限宫位效能分析 (PEI)
            </h4>
            
            {/* 核心交互：进入流年下钻 */}
            <button 
              onClick={() => {
                setTargetDecadeForYearly(selectedDecadeIdx!);
                setViewMode('year');
                setSelectedDecadeIdx(null);
              }}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg transition-all"
            >
              🔍 探查本大限流年
            </button>
          </div>

          {/* 微型条形图：显示该大限最强的 6 个宫位 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
            {activeDetail.palaces.slice(0, 6).map((p, idx) => {
              const tier = getScoreColorTier(p.score);
              const widthPercent = Math.max(0, Math.min(100, ((p.score - 0.1) / 1.4) * 100));
              
              return (
                <div 
                  key={idx} 
                  className="group flex items-center cursor-pointer bg-zinc-900/40 hover:bg-zinc-800/60 p-1.5 rounded transition-colors"
                  onClick={() => onPalaceClick && onPalaceClick(p, activeDetail.range)}
                >
                  <div className="w-14 shrink-0 text-[11px] text-zinc-400 font-medium group-hover:text-zinc-200">
                    {p.name}
                  </div>
                  <div className="flex-1 h-3.5 bg-zinc-800 rounded-full overflow-hidden relative">
                    <div 
                      className={`h-full transition-all duration-700 ease-out rounded-full ${colorMap[tier].bar}`}
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                  <div className={`w-8 shrink-0 text-right text-[10px] font-mono font-bold ml-2 ${colorMap[tier].text}`}>
                    {p.score.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-zinc-500 mt-3 italic text-right">
            *点击上方任意宫位条目，查看多维语义诊断报告。
          </p>
        </div>
      )}
    </div>
  );
};
