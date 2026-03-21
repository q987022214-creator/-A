import React, { useState, useMemo } from 'react';
import { astro } from 'iztro';
import { generateLifeTrendMatrix, generateYearlyTrendMatrix, DynamicPalaceDelta } from '../utils/dynamicScoreCalculator';
import { Vector5D } from '../utils/vCoreEngine';
import { recognizePatterns } from '../utils/patternRecognizer';
import { calculatePalaceScores } from '../utils/scoreCalculator'; 

interface Props {
  iztroData: string | null;
}

export default function TrendHistogram({ iztroData }: Props) {
  const [selectedDimension, setSelectedDimension] = useState<number>(-1);
  const [selectedDecadeIdx, setSelectedDecadeIdx] = useState<number | null>(null);
  
  const [viewMode, setViewMode] = useState<'decade' | 'year'>('decade');
  const [targetDecadeForYearly, setTargetDecadeForYearly] = useState<number>(0);

  const parsedChart = useMemo(() => {
    if (!iztroData) return null;
    try {
      let clean = iztroData.trim();
      if (!clean.startsWith('{')) clean = clean.match(/\{[\s\S]*\}/)?.[0] || '{}';
      const chartObj = JSON.parse(clean);
      if (!chartObj?.rawParams) return null;

      const astrolabe = astro.bySolar(chartObj.rawParams.birthday, chartObj.rawParams.birthTime, chartObj.rawParams.gender, true, 'zh-CN');
      
      const bStem = (astrolabe as any).sy || (astrolabe.chineseDate ? astrolabe.chineseDate.charAt(0) : '甲');
      const bBranch = (astrolabe as any).sb || (astrolabe.chineseDate ? astrolabe.chineseDate.charAt(1) : '子');

      return { astrolabe, chartObj, bStem, bBranch };
    } catch(e) {
      return null;
    }
  }, [iztroData]);

  const trendData = useMemo(() => {
    if (!parsedChart) return null;
    const { astrolabe, chartObj, bStem, bBranch } = parsedChart;
    const basePalaces = astrolabe.palaces;
    const decades = basePalaces.map(p => p.decadal).sort((a,b) => a.range[0] - b.range[0]);
    const basePatterns = recognizePatterns(chartObj);
    const baseScoresData = calculatePalaceScores(chartObj); 
    
    const palaceNames = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母'];

    if (viewMode === 'decade') {
      const matrix = generateLifeTrendMatrix(basePalaces, decades, basePatterns, baseScoresData);
      return { ...matrix, palaceNames: palaceNames.map(n => `大限${n}`) };
    } else {
      const matrix = generateYearlyTrendMatrix(basePalaces, decades, basePatterns, baseScoresData, targetDecadeForYearly, bStem, bBranch);
      return { ...matrix, palaceNames: palaceNames.map(n => `流年${n}`) };
    }
  }, [parsedChart, viewMode, targetDecadeForYearly]);

  if (!trendData) return null;

  const { palaceTrends, overallTrends, labels, palaceNames } = trendData;
  const isOverall = selectedDimension === -1;
  const currentDataArray = isOverall ? overallTrends : palaceTrends[selectedDimension];
  
  const numericScores = currentDataArray.map(item => item.totalDelta);
  const maxAbsValue = Math.max(...numericScores.map(Math.abs), 20); 

  // 🚀 核心几何计算：折线图限定在上半部分 (-15% ~ 15%)，绝不与柱状图混叠
  const svgPoints = currentDataArray.map((item, i) => {
    const x = i * 100 + 50; 
    const y = -15 - (item.totalDelta / maxAbsValue) * 15; 
    return `${x},${y}`;
  }).join(' ');

  const activeDetail = selectedDecadeIdx !== null ? currentDataArray[selectedDecadeIdx] : null;

  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-zinc-800/60 rounded-xl p-4 w-full mb-4 shadow-xl">
      
      {/* 控制栏 (极简紧凑) */}
      <div className="flex justify-between items-center mb-4 border-b border-zinc-800/60 pb-3">
        <div className="flex items-center gap-3">
           <h3 className="text-emerald-400 font-bold text-sm flex items-center gap-2">
             <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
             {viewMode === 'decade' ? '大限综合走势' : '流年精准推演'}
           </h3>
           {viewMode === 'year' && (
              <button onClick={() => { setViewMode('decade'); setSelectedDecadeIdx(null); }} className="text-[10px] font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded transition-colors border border-zinc-700">
                🔙 返回大限盘
              </button>
           )}
        </div>

        <div className="flex gap-2">
          {viewMode === 'year' && (
            <select 
               className="bg-zinc-900 border border-zinc-700 text-indigo-300 text-xs font-bold rounded px-2 py-1 outline-none hover:bg-zinc-800 cursor-pointer"
               value={targetDecadeForYearly}
               onChange={(e) => { setTargetDecadeForYearly(Number(e.target.value)); setSelectedDecadeIdx(null); }}
            >
               {Array.from({length: 10}).map((_, i) => {
                 const dec = parsedChart!.astrolabe.palaces.map(p => p.decadal).sort((a,b) => a.range[0] - b.range[0])[i];
                 return <option key={i} value={i}>🎯 {dec.range[0]}-{dec.range[1]}岁</option>
               })}
            </select>
          )}
          
          <select 
            className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs font-bold rounded px-2 py-1 outline-none hover:bg-zinc-800 cursor-pointer"
            value={selectedDimension}
            onChange={(e) => { setSelectedDimension(Number(e.target.value)); setSelectedDecadeIdx(null); }}
          >
            <option value={-1}>🌟 综合大盘走势</option>
            {palaceNames.map((name, i) => <option key={i} value={i}>📍 {name} 趋势</option>)}
          </select>
        </div>
      </div>

      {/* 🚀 核心图表区：高度极限压缩至 h-40，折柱分离 */}
      <div className="relative h-40 w-full flex items-end justify-between px-2 bg-zinc-900/20 rounded-lg border border-zinc-800/40 mt-2 mb-8">
        
        {/* 0轴基准线 (沉降到底部 65% 的位置) */}
        <div className="absolute left-0 right-0 top-[65%] border-t border-zinc-700/60 border-dashed w-full z-0"></div>

        {/* 互动与柱状图容器层 (z-10) */}
        <div className="absolute inset-0 w-full h-full flex justify-between z-10 pointer-events-none">
          {currentDataArray.map((item, idx) => {
            const score = item.totalDelta;
            const hasActivation = item.activationScore > 0 || item.domainScore > 0;
            const isPositive = score >= 0;
            
            // 柱子高度限制在最大 25% (45%~65% 或 65%~90%)
            const barHeight = (Math.abs(score) / maxAbsValue) * 25; 
            const isSelected = selectedDecadeIdx === idx;
            
            // 折线图圆点 Y 轴位置
            const lineY = -15 - (score / maxAbsValue) * 15; 
            
            return (
              <div key={idx} onClick={() => setSelectedDecadeIdx(isSelected ? null : idx)} className="relative flex flex-col items-center w-[8%] h-full group cursor-pointer pointer-events-auto">
                
                {/* 交互高亮底色 */}
                <div className={`absolute inset-0 w-full h-full rounded transition-colors z-0 ${isSelected ? 'bg-zinc-800/30' : 'hover:bg-zinc-800/20'}`}></div>

                {/* 🟡 折线图圆点 (z-30) */}
                <div className={`absolute w-2.5 h-2.5 bg-zinc-900 border-2 border-yellow-500 rounded-full z-30 transition-transform shadow-md ${isSelected ? 'scale-125' : 'group-hover:scale-125'}`} style={{ top: `calc(${lineY}% - 5px)` }}></div>

                {/* 🎯 探查流年按钮 (精简版) */}
                {viewMode === 'decade' && isSelected && (
                  <div onClick={(e) => { e.stopPropagation(); setTargetDecadeForYearly(idx); setViewMode('year'); setSelectedDecadeIdx(null); }} className="absolute -top-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] px-2 py-1 rounded shadow-lg z-50 whitespace-nowrap cursor-pointer">
                    🔍 流年
                  </div>
                )}

                {/* 🌟 剥离特效的纯色数值：紧贴柱子尖端 */}
                <div className={`absolute text-[10px] font-mono font-bold z-40 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}
                     style={{ top: isPositive ? `calc(${65 - barHeight}% - 16px)` : `calc(${65 + barHeight}% + 2px)` }}>
                  {score > 0 ? '+' : ''}{score}
                </div>

                {/* 🟩 极简适中宽度的正向柱子 */}
                {isPositive && (
                  <div className={`absolute bottom-[35%] w-full max-w-[14px] rounded-t-sm transition-all duration-300 z-10 bg-gradient-to-b from-emerald-500/80 to-emerald-500/10 ${isSelected ? 'brightness-125 ring-1 ring-white/30' : 'opacity-80 group-hover:opacity-100'}`} style={{ height: `${barHeight}%`, minHeight: '2px' }}></div>
                )}

                {/* 🟥 极简适中宽度的负向柱子 */}
                {!isPositive && (
                  <div className={`absolute top-[65%] w-full max-w-[14px] rounded-b-sm transition-all duration-300 z-10 bg-gradient-to-t from-rose-500/80 to-rose-500/10 ${isSelected ? 'brightness-125 ring-1 ring-white/30' : 'opacity-80 group-hover:opacity-100'}`} style={{ height: `${barHeight}%`, minHeight: '2px' }}></div>
                )}

                {/* ✨ 沉降的得位徽章 */}
                {hasActivation && (
                  <div className="absolute top-[88%] whitespace-nowrap bg-amber-500/20 text-amber-500 text-[9px] font-bold px-1 rounded-sm z-20">
                    得位
                  </div>
                )}

                {/* 底部极简标签 */}
                <div className={`absolute top-[105%] text-[10px] text-center leading-tight transition-colors z-20 ${isSelected ? 'text-yellow-500 font-bold' : 'text-zinc-400 group-hover:text-zinc-300'}`}>
                  <span className="block">{labels[idx].split('\n')[0]}</span>
                  <span className="block text-[9px] opacity-60">{labels[idx].split('\n')[1]}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 🟡 独立图层：悬浮的纯黄折线图 (z-20) */}
        <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible opacity-90 drop-shadow-md">
          <polyline points={svgPoints} fill="none" stroke="#eab308" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* 🗂️ 详情核算单面板 (高度压缩，去掉臃肿 padding) */}
      {activeDetail && (
        <div className="mt-4 pt-4 border-t border-zinc-800/60 animate-slide-up">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-zinc-200 font-bold text-sm flex items-center gap-2">
              <span className="bg-zinc-800 px-2 py-0.5 rounded text-xs border border-zinc-700">📅 {labels[selectedDecadeIdx!].replace('\n', ' ')}</span>
              {activeDetail.domainName}
            </h4>
            <div className={`text-lg font-bold font-mono px-2 py-0.5 rounded bg-zinc-900 border ${activeDetail.totalDelta >= 0 ? 'text-emerald-500 border-emerald-500/30' : 'text-rose-500 border-rose-500/30'}`}>
              合战: {activeDetail.totalDelta >= 0 ? '+' : ''}{activeDetail.totalDelta}
            </div>
          </div>

          {/* 🚀 V-Core 5D 向量雷达数据 (新增) */}
          {activeDetail.vector5D && (
            <div className="mb-4 grid grid-cols-5 gap-2">
              {(Object.entries(activeDetail.vector5D) as [keyof Vector5D, number][]).map(([key, val]) => {
                const k = key as string;
                const labelMap: Record<string, string> = { F: '财(F)', P: '权(P)', E: '情(E)', S: '稳(S)', W: '波(W)' };
                const colorMap: Record<string, string> = { F: 'text-emerald-400', P: 'text-indigo-400', E: 'text-rose-400', S: 'text-amber-400', W: 'text-sky-400' };
                return (
                  <div key={k} className="bg-zinc-900/80 border border-zinc-800 rounded p-2 flex flex-col items-center">
                    <span className={`text-[9px] font-bold ${colorMap[k]}`}>{labelMap[k]}</span>
                    <span className="text-sm font-mono font-bold text-zinc-100">{val.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 flex flex-col justify-between">
               <div>
                 <div className="text-xs font-bold mb-2 flex justify-between items-center text-zinc-300">
                  <span>🗃️ {viewMode === 'decade' ? '星曜底分' : '大限底座'}</span>
                  <span className="font-mono text-emerald-500">{activeDetail.baseScore > 0 ? '+' : ''}{activeDetail.baseScore}</span>
                </div>
                <p className="text-[10px] text-zinc-500">
                  {isOverall ? '*十二宫底座总和。' : (viewMode === 'decade' ? `*提取物理【${activeDetail.physicalPalace}】先天吉凶底分。` : `*流年继承【原局+大限】铺垫环境。`)}
                </p>
               </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold mb-2 flex justify-between items-center text-indigo-400">
                  <span>🎯 得位加成</span>
                  <span className="font-mono text-indigo-400">{activeDetail.domainScore > 0 ? '+' : ''}{activeDetail.domainScore}</span>
                </div>
                {activeDetail.domainScore !== 0 ? (
                  <ul className="space-y-1 mt-1 max-h-24 overflow-y-auto custom-scrollbar pr-1">
                    {activeDetail.domainLogs.map((log, i) => (
                      <li key={i} title={log} className="text-[10px] text-indigo-300 flex items-start cursor-help">
                        <span className="mr-1 text-indigo-500">»</span> <span className="truncate">{log}</span>
                      </li>
                    ))}
                  </ul>
                ) : (<div className="text-[10px] text-zinc-600 italic mt-1">未触发得位环境</div>)}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold mb-2 flex justify-between items-center text-amber-500">
                  <span>✨ 格局分</span>
                  <span className="font-mono text-amber-500">{activeDetail.activationScore > 0 ? '+' : ''}{activeDetail.activationScore}</span>
                </div>
                {activeDetail.activationScore > 0 ? (
                  <ul className="space-y-1 mt-1 max-h-24 overflow-y-auto custom-scrollbar pr-1">
                    {activeDetail.activationLogs.map((log, i) => (
                      <li key={i} title={log} className="text-[10px] text-amber-300 flex items-start cursor-help">
                        <span className="mr-1 text-amber-600">»</span> <span className="truncate">{log}</span>
                      </li>
                    ))}
                  </ul>
                ) : (<div className="text-[10px] text-zinc-600 italic mt-1">未触发主场格局</div>)}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold mb-2 flex justify-between items-center text-sky-500">
                  <span>🌪️ 共振与引动</span>
                  <span className={`font-mono ${activeDetail.overlayScore >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {activeDetail.overlayScore > 0 ? '+' : ''}{activeDetail.overlayScore}
                  </span>
                </div>
                {activeDetail.overlayLogs.length > 0 ? (
                  <ul className="space-y-1 mt-1 h-24 overflow-y-auto pr-1 custom-scrollbar">
                    {activeDetail.overlayLogs.map((log, i) => (
                      <li key={i} title={log} className={`text-[10px] flex justify-between items-center border-b border-zinc-800/60 pb-1 cursor-help ${log.includes('🌠') ? 'text-amber-400 font-bold' : (isOverall ? 'text-zinc-300' : 'text-zinc-400')}`}>
                        <span className="truncate pr-2">{log.split(':')[0]}</span>
                        {log.includes(':') && (
                          <span className={`font-mono ${log.includes('+') ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {log.split(':')[1]}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (<div className="text-[10px] text-zinc-600 italic mt-1">未受显著引动</div>)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
