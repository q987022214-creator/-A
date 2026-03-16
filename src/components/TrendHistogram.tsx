// src/components/TrendHistogram.tsx
import React, { useState, useMemo } from 'react';
import { astro } from 'iztro';
import { generateLifeTrendMatrix, DynamicPalaceDelta } from '../utils/dynamicScoreCalculator';
import { recognizePatterns } from '../utils/patternRecognizer';
import { calculatePalaceScores } from '../utils/scoreCalculator'; 

interface Props {
  iztroData: string | null;
}

export default function TrendHistogram({ iztroData }: Props) {
  const [selectedDimension, setSelectedDimension] = useState<number>(-1);
  const [selectedDecade, setSelectedDecade] = useState<number | null>(null);

  const trendData = useMemo(() => {
    if (!iztroData) return null;
    try {
      let clean = iztroData.trim();
      if (!clean.startsWith('{')) clean = clean.match(/\{[\s\S]*\}/)?.[0] || '{}';
      const chartObj = JSON.parse(clean);
      if (!chartObj?.rawParams) return null;

      const astrolabe = astro.bySolar(chartObj.rawParams.birthday, chartObj.rawParams.birthTime, chartObj.rawParams.gender, true, 'zh-CN');
      const basePalaces = astrolabe.palaces;
      const palaceNames = ['大限命宫', '大限兄弟', '大限夫妻', '大限子女', '大限财帛', '大限疾厄', '大限迁移', '大限交友', '大限官禄', '大限田宅', '大限福德', '大限父母'];
      const decades = basePalaces.map(p => p.decadal).sort((a,b) => a.range[0] - b.range[0]);
      
      const basePatterns = recognizePatterns(chartObj);
      const baseScoresData = calculatePalaceScores(chartObj); // 底层返回包含 baseScore(纯星曜) 和 totalScore 的数组

      const matrix = generateLifeTrendMatrix(basePalaces, decades, basePatterns, baseScoresData);
      return { ...matrix, palaceNames };
    } catch(e) {
      return null;
    }
  }, [iztroData]);

  if (!trendData) return null;

  const { palaceTrends, overallTrends, decadeLabels, palaceNames } = trendData;
  const isOverall = selectedDimension === -1;
  const currentDataArray = isOverall ? overallTrends : palaceTrends[selectedDimension];
  
  const numericScores = currentDataArray.map(item => item.totalDelta);
  const maxAbsValue = Math.max(...numericScores.map(Math.abs), 20); 

  const activeDetail = selectedDecade !== null ? currentDataArray[selectedDecade] : null;

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 w-full mb-6 shadow-lg shadow-black/40">
      
      <div className="flex justify-between items-end mb-8 border-b border-zinc-800 pb-4">
        <div>
          <h3 className="text-emerald-500 font-bold tracking-widest text-sm flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></span>
            全息百年运限趋势直方图
          </h3>
          <p className="text-zinc-500 text-xs mt-1.5">
            {isOverall 
              ? '洞察一生综合起伏（该大限十二宫总和）' 
              : `追踪【${palaceNames[selectedDimension]}】在各阶段的动态走势`}
          </p>
        </div>
        <select 
          className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded-md px-3 py-1.5 outline-none hover:border-emerald-500/50 cursor-pointer"
          value={selectedDimension}
          onChange={(e) => { setSelectedDimension(Number(e.target.value)); setSelectedDecade(null); }}
        >
          <option value={-1}>🌟 综合大盘走势</option>
          {palaceNames.map((name, i) => <option key={i} value={i}>📍 {name} 趋势</option>)}
        </select>
      </div>

      <div className="relative h-48 w-full flex items-end justify-between px-2 pt-8 pb-2">
        <div className="absolute left-0 right-0 top-1/2 border-t border-zinc-800 border-dashed w-full -translate-y-1/2 z-0"></div>
        
        {currentDataArray.map((item, idx) => {
          const score = item.totalDelta;
          const hasActivation = item.activationScore > 0 || item.domainScore > 0;
          const isPositive = score >= 0;
          const heightPercent = (Math.abs(score) / maxAbsValue) * 45;
          const isSelected = selectedDecade === idx;
          
          return (
            <div 
              key={idx} 
              onClick={() => setSelectedDecade(isSelected ? null : idx)}
              className="relative flex flex-col items-center w-[8%] h-full group cursor-pointer z-10"
            >
              {hasActivation && (
                <div className="absolute -top-7 whitespace-nowrap bg-amber-500/20 border border-amber-500/50 text-amber-400 text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 shadow-[0_0_8px_rgba(245,158,11,0.3)] animate-pulse">
                  ✨ 得位
                </div>
              )}

              <div className="w-full h-1/2 flex items-end justify-center pb-0.5">
                {isPositive && (
                  <div 
                    style={{ height: `${heightPercent}%`, minHeight: '4px' }} 
                    className={`w-full max-w-[24px] rounded-t-sm transition-all duration-300 
                      ${isSelected ? 'bg-emerald-400 shadow-[0_0_15px_#10b981]' : (hasActivation ? 'bg-gradient-to-t from-emerald-600 to-amber-400' : 'bg-gradient-to-t from-emerald-700 to-emerald-500 group-hover:to-emerald-400')}`}
                  ></div>
                )}
              </div>

              <div className="w-full h-1/2 flex items-start justify-center pt-0.5">
                {!isPositive && (
                  <div 
                    style={{ height: `${heightPercent}%`, minHeight: '4px' }} 
                    className={`w-full max-w-[24px] rounded-b-sm transition-all duration-300 
                      ${isSelected ? 'bg-rose-400 shadow-[0_0_15px_#f43f5e]' : 'bg-gradient-to-b from-rose-800 to-rose-500 group-hover:to-rose-400'}`}
                  ></div>
                )}
              </div>

              <div className={`absolute text-[11px] font-mono font-bold transition-all duration-300 ${isPositive ? 'bottom-1/2 mb-1 group-hover:-translate-y-1 text-emerald-400' : 'top-1/2 mt-1 group-hover:translate-y-1 text-rose-400'}`}>
                {score > 0 ? '+' : ''}{score}
              </div>

              <div className={`absolute -bottom-10 text-[9px] text-center leading-tight transition-colors ${isSelected ? 'text-emerald-400 font-bold' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                <span className="block">{decadeLabels[idx].split('\n')[0]}</span>
                <span className="block opacity-60">{decadeLabels[idx].split('\n')[1]}</span>
              </div>
            </div>
          );
        })}
      </div>

      {activeDetail && (
        <div className="mt-14 pt-5 border-t border-zinc-800 animate-slide-up">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-white font-bold text-sm">
              <span className="text-zinc-500 mr-2">📅 [ {decadeLabels[selectedDecade!].replace('\n', ' ')} ]</span>
              {activeDetail.domainName} 核算单
            </h4>
            <div className={`text-xl font-bold font-mono ${activeDetail.totalDelta >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              大限总战力: {activeDetail.totalDelta >= 0 ? '+' : ''}{activeDetail.totalDelta}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 一：原局星曜底分 (剔除了格局) */}
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
               <div>
                 <div className="text-xs font-bold mb-2 flex justify-between items-center text-zinc-300">
                  <span>🗃️ 一：原局星曜底分</span>
                  <span className="font-mono text-emerald-300/80">{activeDetail.baseScore > 0 ? '+' : ''}{activeDetail.baseScore}</span>
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed">
                  {isOverall 
                    ? '*十二宫底分总和。' 
                    : `*追溯：物理落点【${activeDetail.physicalPalace}】，已提取其先天星曜吉凶分(剔除原局格局)。`}
                </p>
               </div>
            </div>

            {/* 二：大运得位分 */}
            <div className={`p-3 rounded-lg border flex flex-col justify-between ${activeDetail.domainScore !== 0 ? 'bg-indigo-950/20 border-indigo-900/50' : 'bg-zinc-900 border-zinc-800'}`}>
              <div>
                <div className="text-xs font-bold mb-2 flex justify-between items-center text-indigo-400/80">
                  <span>🎯 二：大运得位加成</span>
                  <span className="font-mono">{activeDetail.domainScore > 0 ? '+' : ''}{activeDetail.domainScore}</span>
                </div>
                {activeDetail.domainScore !== 0 ? (
                  <ul className="space-y-1 mt-2 max-h-20 overflow-y-auto custom-scrollbar">
                    {activeDetail.domainLogs.map((log, i) => (
                      <li key={i} className="text-[10px] text-indigo-200/90 flex items-start leading-tight">
                        <span className="mr-1.5 mt-0.5 opacity-60">»</span> {log}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-[10px] text-zinc-600 italic mt-2">未触发大运宫位得位环境。</div>
                )}
              </div>
            </div>

            {/* 三：格局潜能觉醒 */}
            <div className={`p-3 rounded-lg border flex flex-col justify-between ${activeDetail.activationScore > 0 ? 'bg-amber-950/20 border-amber-900/50' : 'bg-zinc-900 border-zinc-800'}`}>
              <div>
                <div className="text-xs font-bold mb-2 flex justify-between items-center text-amber-500/80">
                  <span>✨ 三：大运格局分</span>
                  <span className="font-mono">{activeDetail.activationScore > 0 ? '+' : ''}{activeDetail.activationScore}</span>
                </div>
                {activeDetail.activationScore > 0 ? (
                  <ul className="space-y-1 mt-2 max-h-20 overflow-y-auto custom-scrollbar">
                    {activeDetail.activationLogs.map((log, i) => (
                      <li key={i} className="text-[10px] text-amber-200/90 flex items-start leading-tight">
                        <span className="mr-1.5 mt-0.5 opacity-60">»</span> {log}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-[10px] text-zinc-600 italic mt-2">未触发大限强宫的主场格局。</div>
                )}
              </div>
            </div>

            {/* 四：大运吉煞星与四化叠加 */}
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold mb-2 flex justify-between items-center text-blue-400/80">
                  <span>🌪️ 四：大运四化叠加</span>
                  <span className={`font-mono ${activeDetail.overlayScore >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {activeDetail.overlayScore > 0 ? '+' : ''}{activeDetail.overlayScore}
                  </span>
                </div>
                {activeDetail.overlayLogs.length > 0 ? (
                  <ul className="space-y-1 h-20 overflow-y-auto pr-1 custom-scrollbar">
                    {activeDetail.overlayLogs.map((log, i) => (
                      <li key={i} className="text-[10px] text-zinc-400 flex justify-between border-b border-zinc-800/50 pb-0.5">
                        <span className="truncate pr-2">{log.split(':')[0]}</span>
                        {log.includes(':') && (
                          <span className={`font-mono ${log.includes('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {log.split(':')[1]}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-[10px] text-zinc-600 italic mt-2">未受大运四化吉煞显著引动。</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
