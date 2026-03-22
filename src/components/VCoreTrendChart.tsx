import React, { useState, useMemo, useCallback } from 'react';
import { DecadeData, YearlyTrend } from '../utils/vCoreEngine';

interface Props {
  data: DecadeData[];
  onPalaceClick?: (palace: any, decadeRange: string) => void;
}

export const VCoreTrendChart: React.FC<Props> = ({ data, onPalaceClick }) => {
  const [viewMode, setViewMode] = useState<'decade' | 'year'>('decade');
  const [targetDecadeForYearly, setTargetDecadeForYearly] = useState<number>(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string>('global');

  const isDecadeMode = viewMode === 'decade';
  const currentArray = isDecadeMode 
    ? data 
    : (data[targetDecadeForYearly]?.yearlyTrends || []);

  const palaceNames = useMemo(() => {
    if (!data || data.length === 0 || !data[0].palaces) return [];
    return data[0].palaces.map(p => p.name);
  }, [data]);

  const getScore = useCallback((item: any) => {
    if (selectedTarget === 'global') {
      return isDecadeMode ? item.dgs : item.ygs;
    }
    const palace = item.palaces?.find((p: any) => p.name === selectedTarget);
    return palace ? palace.score : 1.0;
  }, [selectedTarget, isDecadeMode]);

  // Calculate baseline and max deviation for mapping
  const { maxDeviation } = useMemo(() => {
    if (!currentArray || currentArray.length === 0) return { maxDeviation: 0.3 };
    const scores = currentArray.map((item: any) => getScore(item));
    const maxDev = Math.max(...scores.map((s: number) => Math.abs(s - 1.0)), 0.3);
    return { maxDeviation: maxDev };
  }, [currentArray, getScore]);

  // Generate SVG polyline points (mapped to top 10% - 40%)
  const svgPoints = useMemo(() => {
    return currentArray.map((item: any, i: number) => {
      const score = getScore(item);
      const x = ((i + 0.5) / currentArray.length) * 1000;
      // Map score 0.1~1.5 to Y 50~0 (shifted up by 10% from original 60~10)
      const y = 50 - (Math.min(score, 1.5) / 1.5) * 50;
      return `${x},${y}`;
    }).join(' ');
  }, [currentArray, getScore]);

  if (!data || data.length === 0) return null;

  const activeDetail = selectedIdx !== null ? currentArray[selectedIdx] : null;

  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-zinc-800/60 rounded-xl p-4 w-full mb-4 shadow-xl transition-all duration-300">
      
      {/* 控制栏 (极简紧凑) */}
      <div className="flex justify-between items-center mb-4 border-b border-zinc-800/60 pb-3">
        <div className="flex items-center gap-3">
           <h3 className="text-emerald-400 font-bold text-sm flex items-center gap-2">
             <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
             {isDecadeMode ? '大限综合走势' : '流年精准推演'}
           </h3>
           {viewMode === 'year' && (
              <button onClick={() => { setViewMode('decade'); setSelectedIdx(null); }} className="text-[10px] font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded transition-colors border border-zinc-700">
                🔙 返回大限盘
              </button>
           )}
        </div>

        <div className="flex gap-2">
          {viewMode === 'year' && (
            <select 
               className="bg-zinc-900 border border-zinc-700 text-indigo-300 text-xs font-bold rounded px-2 py-1 outline-none hover:bg-zinc-800 cursor-pointer"
               value={targetDecadeForYearly}
               onChange={(e) => { setTargetDecadeForYearly(Number(e.target.value)); setSelectedIdx(null); }}
            >
               {data.map((dec, i) => (
                 <option key={i} value={i}>🎯 {dec.range}岁</option>
               ))}
            </select>
          )}
          
          <select
            className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs font-bold rounded px-3 py-1 outline-none hover:bg-zinc-800 cursor-pointer"
            value={selectedTarget}
            onChange={(e) => setSelectedTarget(e.target.value)}
          >
            <option value="global">🌟 综合大盘走势</option>
            {palaceNames.map(name => (
              <option key={name} value={name}>
                📍 {isDecadeMode ? '大限' : '流年'}{name} 走势
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 🚀 核心图表区：高度极限压缩至 h-40，折柱分离 */}
      <div className="relative h-40 w-full flex items-end justify-between px-2 bg-zinc-900/20 rounded-lg border border-zinc-800/40 mt-2 mb-8">
        
        {/* 底部基准线 (沉降到底部 25% 的位置) */}
        <div className="absolute left-0 right-0 bottom-[25%] border-t border-zinc-700/60 border-dashed w-full z-0"></div>

        {/* 互动与柱状图容器层 (z-10) */}
        <div className="absolute inset-0 w-full h-full flex justify-between z-10 pointer-events-none">
          {currentArray.map((item: any, idx: number) => {
            const score = getScore(item);
            const label = isDecadeMode ? item.range : `${item.age}岁`;
            const subLabel = isDecadeMode ? `${item.stem}${item.branch}限` : (item.year ? `${item.year}年` : `年`);
            
            const isPositive = score >= 1.0;
            
            // 柱子高度：从 bottom 25% 向上生长，最高占 40%
            const barHeight = Math.max(2, (Math.min(score, 1.5) / 1.5) * 40); 
            const isSelected = selectedIdx === idx;
            
            // 折线图圆点 Y 轴位置 (shifted up by 10% from original 60~10)
            const lineY = 50 - (Math.min(score, 1.5) / 1.5) * 50; 
            
            return (
              <div key={idx} onClick={() => setSelectedIdx(isSelected ? null : idx)} className="relative flex flex-col items-center w-[8%] h-full group cursor-pointer pointer-events-auto">
                
                {/* 交互高亮底色 */}
                <div className={`absolute inset-0 w-full h-full rounded transition-colors z-0 ${isSelected ? 'bg-zinc-800/30' : 'hover:bg-zinc-800/20'}`}></div>

                {/* 🟢 折线图圆点 (z-30) - 统一大小，不再随选中放大 */}
                <div className={`absolute w-2.5 h-2.5 bg-zinc-900 border-2 ${isPositive ? 'border-emerald-500' : 'border-rose-500'} rounded-full z-30 transition-transform shadow-md`} style={{ top: `calc(${lineY}% - 5px)` }}></div>

                {/* 🎯 探查流年按钮 (精简版) */}
                {isDecadeMode && isSelected && (
                  <div onClick={(e) => { e.stopPropagation(); setTargetDecadeForYearly(idx); setViewMode('year'); setSelectedIdx(null); }} className="absolute -top-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] px-2 py-1 rounded shadow-lg z-50 whitespace-nowrap cursor-pointer">
                    🔍 流年
                  </div>
                )}

                {/* 🌟 剥离特效的纯色数值：紧贴柱子尖端，动态颜色 */}
                <div className={`absolute text-[10px] font-mono font-bold z-40 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}
                     style={{ bottom: `calc(25% + ${barHeight}% + 4px)` }}>
                  {score.toFixed(2)}
                </div>

                {/* 🟩 统一向上生长的动态颜色柱子 */}
                <div className={`absolute bottom-[25%] w-full max-w-[14px] rounded-t-sm transition-all duration-300 z-10 ${isPositive ? 'bg-gradient-to-b from-emerald-400/80 to-emerald-500/10' : 'bg-gradient-to-b from-rose-400/80 to-rose-500/10'} ${isSelected ? 'brightness-125 ring-1 ring-white/30' : 'opacity-80 group-hover:opacity-100'}`} style={{ height: `${barHeight}%`, minHeight: '2px' }}></div>

                {/* 底部极简标签 */}
                <div className={`absolute top-[80%] text-[10px] text-center leading-tight transition-colors z-20 ${isSelected ? 'text-yellow-500 font-bold' : 'text-zinc-400 group-hover:text-zinc-300'}`}>
                  <span className="block">{label}</span>
                  <span className="block text-[9px] opacity-60">{subLabel}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 🟡 独立图层：悬浮的纯黄折线图 (z-20) - 线条变细 50% */}
        <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible opacity-90 drop-shadow-md">
          <polyline points={svgPoints} fill="none" stroke="#eab308" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* 🗂️ 详情核算单面板 (高度压缩，去掉臃肿 padding) */}
      {activeDetail && activeDetail.palaces && (
        <div className="mt-4 pt-4 border-t border-zinc-800/60 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-3 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50">
            <h4 className="text-zinc-200 font-bold text-sm flex items-center gap-2">
              <span className="bg-zinc-900 px-2 py-0.5 rounded text-xs border border-zinc-700 flex items-center gap-1">
                📅 {isDecadeMode ? (activeDetail as DecadeData).range : `${(activeDetail as YearlyTrend).age}岁 (${(activeDetail as YearlyTrend).year}年)`} {isDecadeMode ? `${(activeDetail as DecadeData).stem}${(activeDetail as DecadeData).branch}限` : `年`}
              </span>
              {selectedTarget === 'global' ? (isDecadeMode ? '大限宫位效能' : '流年宫位效能') : `${selectedTarget} 效能`}
            </h4>
            <div className={`text-lg font-bold font-mono px-3 py-0.5 rounded bg-zinc-950 border ${getScore(activeDetail) >= 1.0 ? 'text-emerald-500 border-emerald-500/30' : 'text-rose-500 border-rose-500/30'}`}>
              {getScore(activeDetail).toFixed(2)}
            </div>
          </div>
 
          {/* 🚀 极简双排 6x2 固定网格 (极致压缩版) */}
          <div className="grid grid-cols-6 gap-1.5">
            {[
              "命宫", "兄弟", "夫妻", "子女", "财帛", "疾厄", 
              "迁移", "交友", "官禄", "田宅", "福德", "父母"
            ].map((shortName) => {
              const fullName = shortName === "命宫" ? "命宫" : shortName + "宫";
              const fallbackName = fullName === "交友宫" ? "仆役宫" : fullName;
              const p = activeDetail.palaces.find((pal: any) => pal.name === fullName || pal.name === fallbackName) || { name: shortName, score: 1.0 };
              
              const isPositive = p.score >= 1.0;
              const isSelected = selectedTarget === p.name;

              return (
                <div 
                  key={shortName} 
                  className={`group flex items-center justify-center rounded-md border transition-all cursor-pointer py-1.5 px-0.5 text-[11px] font-bold tracking-widest ${
                    isSelected 
                      ? 'bg-indigo-500 text-white border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.4)]' 
                      : isPositive 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                  }`}
                  onClick={() => onPalaceClick && onPalaceClick(p, isDecadeMode ? (activeDetail as DecadeData).range : `${(activeDetail as YearlyTrend).age}岁`)}
                >
                  {shortName}
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
