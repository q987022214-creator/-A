import React, { useState, useMemo } from 'react';
import { astro } from 'iztro';
import { generateLifeTrendMatrix, generateYearlyTrendMatrix, DynamicPalaceDelta } from '../utils/dynamicScoreCalculator';
import { recognizePatterns } from '../utils/patternRecognizer';
import { calculatePalaceScores } from '../utils/scoreCalculator'; 

interface Props {
  iztroData: string | null;
}

export default function TrendHistogram({ iztroData }: Props) {
  const [selectedDimension, setSelectedDimension] = useState<number>(-1);
  const [selectedDecadeIdx, setSelectedDecadeIdx] = useState<number | null>(null);
  
  // 🚀 核心交互状态
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
      
      const bYearStr = astrolabe.eightChar?.year || '甲子'; 
      const bStem = bYearStr.charAt(0);
      const bBranch = bYearStr.charAt(1);

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

  const activeDetail = selectedDecadeIdx !== null ? currentDataArray[selectedDecadeIdx] : null;

  return (
    // 🎨 恢复您的外壳 UI: backdrop-blur-sm, rounded-2xl, p-6 等
    <div className="bg-zinc-950/50 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-6 w-full mb-6 shadow-2xl">
      
      {/* 顶部控制栏 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-zinc-800/50 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-3">
             <h3 className="text-emerald-400 font-bold tracking-widest text-base flex items-center gap-2">
               <span className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]"></span>
               {viewMode === 'decade' ? '全息百年大限趋势直方图' : '全息十年流年趋势直方图'}
             </h3>
             {viewMode === 'year' && (
                <button onClick={() => { setViewMode('decade'); setSelectedDecadeIdx(null); }} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 border border-zinc-700/50">
                  🔙 返回大限总盘
                </button>
             )}
          </div>
          <p className="text-zinc-400 text-sm mt-2 font-medium">
            {isOverall 
              ? `洞察${viewMode === 'decade' ? '大限' : '流年'}综合起伏（十二宫总和）` 
              : `追踪【${palaceNames[selectedDimension]}】在各阶段的动态走势`}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {viewMode === 'year' && (
            <select 
               className="bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-sm rounded-lg px-4 py-2 outline-none hover:border-indigo-500/60 cursor-pointer focus:ring-2 focus:ring-indigo-500/20 transition-all"
               value={targetDecadeForYearly}
               onChange={(e) => { setTargetDecadeForYearly(Number(e.target.value)); setSelectedDecadeIdx(null); }}
            >
               {Array.from({length: 10}).map((_, i) => {
                 const dec = parsedChart!.astrolabe.palaces.map(p => p.decadal).sort((a,b) => a.range[0] - b.range[0])[i];
                 return <option key={i} value={i} className="bg-zinc-900">🎯 {dec.range[0]}-{dec.range[1]}岁大限</option>
               })}
            </select>
          )}
          
          <select 
            className="bg-zinc-900/80 border border-zinc-700/80 text-zinc-300 text-sm rounded-lg px-4 py-2 outline-none hover:border-emerald-500/50 cursor-pointer focus:ring-2 focus:ring-emerald-500/20 transition-all"
            value={selectedDimension}
            onChange={(e) => { setSelectedDimension(Number(e.target.value)); setSelectedDecadeIdx(null); }}
          >
            <option value={-1} className="bg-zinc-900">🌟 综合大盘走势</option>
            {palaceNames.map((name, i) => <option key={i} value={i} className="bg-zinc-900">📍 {name} 趋势</option>)}
          </select>
        </div>
      </div>

      {/* 🎨 恢复您的直方图 UI: h-64, 更宽的圆角柱子等 */}
      <div className="relative h-64 w-full flex items-end justify-between px-4 pt-10 pb-4 bg-zinc-900/20 rounded-xl border border-zinc-800/30">
        <div className="absolute left-0 right-0 top-1/2 border-t border-zinc-800/60 border-dashed w-full -translate-y-1/2 z-0"></div>
        
        {currentDataArray.map((item, idx) => {
          const score = item.totalDelta;
          const hasActivation = item.activationScore > 0 || item.domainScore > 0;
          const isPositive = score >= 0;
          const heightPercent = (Math.abs(score) / maxAbsValue) * 45;
          const isSelected = selectedDecadeIdx === idx;
          
          return (
            <div key={idx} onClick={() => setSelectedDecadeIdx(isSelected ? null : idx)} className="relative flex flex-col items-center w-[8%] h-full group cursor-pointer z-10">
              {hasActivation && (
                <div className="absolute -top-8 whitespace-nowrap bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] px-2 py-1 rounded-md flex items-center gap-1 shadow-[0_0_12px_rgba(245,158,11,0.2)] animate-pulse backdrop-blur-sm">
                  ✨ 得位
                </div>
              )}
              
              {viewMode === 'decade' && isSelected && (
                <div onClick={(e) => { e.stopPropagation(); setTargetDecadeForYearly(idx); setViewMode('year'); setSelectedDecadeIdx(null); }} className="absolute -top-16 bg-indigo-500/90 hover:bg-indigo-400 text-white text-xs px-3 py-1.5 rounded-lg shadow-xl animate-fade-in whitespace-nowrap backdrop-blur-sm border border-indigo-400/50 transition-colors">
                  🔍 探查此大限流年
                </div>
              )}

              <div className="w-full h-1/2 flex items-end justify-center pb-1">
                {isPositive && <div style={{ height: `${heightPercent}%`, minHeight: '4px' }} className={`w-full max-w-[32px] rounded-t-md transition-all duration-500 ease-out ${isSelected ? 'bg-emerald-400 shadow-[0_0_20px_#10b981]' : (hasActivation ? 'bg-gradient-to-t from-emerald-600 to-amber-400' : 'bg-gradient-to-t from-emerald-600 to-emerald-400 group-hover:to-emerald-300 group-hover:shadow-[0_0_15px_rgba(52,211,153,0.4)]')}`}></div>}
              </div>
              <div className="w-full h-1/2 flex items-start justify-center pt-1">
                {!isPositive && <div style={{ height: `${heightPercent}%`, minHeight: '4px' }} className={`w-full max-w-[32px] rounded-b-md transition-all duration-500 ease-out ${isSelected ? 'bg-rose-400 shadow-[0_0_20px_#f43f5e]' : 'bg-gradient-to-b from-rose-700 to-rose-500 group-hover:to-rose-400 group-hover:shadow-[0_0_15px_rgba(244,63,94,0.4)]'}`}></div>}
              </div>
              <div className={`absolute text-xs font-mono font-bold transition-all duration-300 ${isPositive ? 'bottom-1/2 mb-2 group-hover:-translate-y-1 text-emerald-400' : 'top-1/2 mt-2 group-hover:translate-y-1 text-rose-400'}`}>
                {score > 0 ? '+' : ''}{score}
              </div>
              <div className={`absolute -bottom-12 text-[10px] text-center leading-relaxed transition-colors ${isSelected ? 'text-emerald-400 font-bold scale-110' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                <span className="block">{labels[idx].split('\n')[0]}</span>
                <span className="block opacity-70">{labels[idx].split('\n')[1]}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🗂️ 详情面板 */}
      {activeDetail && (
        <div className="mt-14 pt-6 border-t border-zinc-800/50 animate-slide-up">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h4 className="text-white font-bold text-base flex items-center gap-2">
              <span className="text-zinc-400 bg-zinc-900 px-2 py-1 rounded-md text-sm border border-zinc-800">📅 {labels[selectedDecadeIdx!].replace('\n', ' ')}</span>
              {activeDetail.domainName} <span className="text-zinc-500 font-normal">核算单</span>
            </h4>
            <div className={`text-2xl font-bold font-mono px-4 py-1.5 rounded-lg bg-zinc-900/50 border ${activeDetail.totalDelta >= 0 ? 'text-emerald-400 border-emerald-900/50 shadow-[0_0_15px_rgba(52,211,153,0.1)]' : 'text-rose-400 border-rose-900/50 shadow-[0_0_15px_rgba(244,63,94,0.1)]'}`}>
              综合战力: {activeDetail.totalDelta >= 0 ? '+' : ''}{activeDetail.totalDelta}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/50 hover:bg-zinc-900/60 transition-colors flex flex-col justify-between group">
               <div>
                 <div className="text-sm font-bold mb-3 flex justify-between items-center text-zinc-200">
                  <span className="flex items-center gap-1.5">🗃️ {viewMode === 'decade' ? '原局星曜底分' : '大限环境底座'}</span>
                  <span className="font-mono text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded text-sm">{activeDetail.baseScore > 0 ? '+' : ''}{activeDetail.baseScore}</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors">
                  {isOverall ? '*十二宫底座总和。' : (viewMode === 'decade' ? `*追溯物理落点【${activeDetail.physicalPalace}】，提取先天吉凶底分。` : `*流年继承了【原局+大限】铺垫的环境分。`)}
                </p>
               </div>
            </div>

            <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${activeDetail.domainScore !== 0 ? 'bg-indigo-950/20 border-indigo-500/30 hover:bg-indigo-950/30 shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]' : 'bg-zinc-900/40 border-zinc-800/50 hover:bg-zinc-900/60'}`}>
              <div>
                <div className="text-sm font-bold mb-3 flex justify-between items-center text-indigo-300">
                  <span className="flex items-center gap-1.5">🎯 {viewMode === 'decade' ? '大运' : '流年'}得位加成</span>
                  <span className="font-mono bg-indigo-950/50 px-2 py-0.5 rounded text-sm">{activeDetail.domainScore > 0 ? '+' : ''}{activeDetail.domainScore}</span>
                </div>
                {activeDetail.domainScore !== 0 ? (
                  <ul className="space-y-1.5 mt-3 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                    {activeDetail.domainLogs.map((log, i) => (
                      <li key={i} title={log} className="text-xs text-indigo-200/80 flex items-start leading-tight cursor-help hover:text-indigo-100 transition-colors">
                        <span className="mr-1.5 mt-0.5 text-indigo-500/60">»</span> <span className="truncate">{log}</span>
                      </li>
                    ))}
                  </ul>
                ) : (<div className="text-xs text-zinc-600 italic mt-3 flex items-center justify-center h-12 bg-zinc-950/30 rounded-lg border border-zinc-800/30">未触发得位环境</div>)}
              </div>
            </div>

            <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${activeDetail.activationScore > 0 ? 'bg-amber-950/10 border-amber-500/30 hover:bg-amber-950/20 shadow-[inset_0_0_20px_rgba(245,158,11,0.05)]' : 'bg-zinc-900/40 border-zinc-800/50 hover:bg-zinc-900/60'}`}>
              <div>
                <div className="text-sm font-bold mb-3 flex justify-between items-center text-amber-400">
                  <span className="flex items-center gap-1.5">✨ {viewMode === 'decade' ? '大运' : '流年'}格局分</span>
                  <span className="font-mono bg-amber-950/40 px-2 py-0.5 rounded text-sm">{activeDetail.activationScore > 0 ? '+' : ''}{activeDetail.activationScore}</span>
                </div>
                {activeDetail.activationScore > 0 ? (
                  <ul className="space-y-1.5 mt-3 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                    {activeDetail.activationLogs.map((log, i) => (
                      <li key={i} title={log} className="text-xs text-amber-200/80 flex items-start leading-tight cursor-help hover:text-amber-100 transition-colors">
                        <span className="mr-1.5 mt-0.5 text-amber-500/60">»</span> <span className="truncate">{log}</span>
                      </li>
                    ))}
                  </ul>
                ) : (<div className="text-xs text-zinc-600 italic mt-3 flex items-center justify-center h-12 bg-zinc-950/30 rounded-lg border border-zinc-800/30">未触发主场格局</div>)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/50 hover:bg-zinc-900/60 transition-colors flex flex-col justify-between group">
              <div>
                <div className="text-sm font-bold mb-3 flex justify-between items-center text-sky-400">
                  <span className="flex items-center gap-1.5">🌪️ 共振与引动</span>
                  <span className={`font-mono px-2 py-0.5 rounded text-sm ${activeDetail.overlayScore >= 0 ? 'text-emerald-400 bg-emerald-950/30' : 'text-rose-400 bg-rose-950/30'}`}>
                    {activeDetail.overlayScore > 0 ? '+' : ''}{activeDetail.overlayScore}
                  </span>
                </div>
                {activeDetail.overlayLogs.length > 0 ? (
                  <ul className="space-y-2 mt-3 h-32 overflow-y-auto pr-2 custom-scrollbar">
                    {activeDetail.overlayLogs.map((log, i) => (
                      <li key={i} title={log} className={`text-xs flex justify-between items-center border-b border-zinc-800/60 pb-1.5 cursor-help hover:bg-zinc-800/30 px-1 rounded transition-colors ${log.includes('🌠') ? 'text-amber-300 font-bold bg-amber-950/20' : (isOverall ? 'text-zinc-300' : 'text-zinc-400')}`}>
                        <span className="truncate pr-3">{log.split(':')[0]}</span>
                        {log.includes(':') && (
                          <span className={`font-mono whitespace-nowrap ${log.includes('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {log.split(':')[1]}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (<div className="text-xs text-zinc-600 italic mt-3 flex items-center justify-center h-12 bg-zinc-950/30 rounded-lg border border-zinc-800/30">未受显著引动</div>)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
