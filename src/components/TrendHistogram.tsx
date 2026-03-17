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
      const baseScoresData = calculatePalaceScores(chartObj); 

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
      
      <div className="flex justify-between items-end mb-6 border-b border-zinc-800 pb-4">
        <div>
          <h3 className="text-emerald-500 font-bold tracking-widest text-sm flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></span>
            全息百年运限趋势直方图
          </h3>
          <p className="text-zinc-400 text-xs mt-1.5">
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

      <div className="relative h-28 w-full px-2 mt-8 mb-12">
        {/* Zero line for Line Chart (centered in top 65%) */}
        <div className="absolute left-0 right-0 top-[35%] border-t border-zinc-500/30 border-dashed w-full z-0"></div>

        {/* Line Chart (K-line style connecting the dots) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" style={{ overflow: 'visible' }}>
          {currentDataArray.map((item, idx) => {
            if (idx === 0) return null;
            const prevItem = currentDataArray[idx - 1];
            const prevScore = prevItem.totalDelta;
            const currScore = item.totalDelta;

            const prevY = 35 - (prevScore / maxAbsValue) * 30;
            const currY = 35 - (currScore / maxAbsValue) * 30;

            const prevX = 4 + ((idx - 1) * (92 / (currentDataArray.length - 1)));
            const currX = 4 + (idx * (92 / (currentDataArray.length - 1)));

            return (
              <line
                key={`line-${idx}`}
                x1={`${prevX}%`}
                y1={`${prevY}%`}
                x2={`${currX}%`}
                y2={`${currY}%`}
                stroke="#facc15"
                strokeWidth="2"
                className="drop-shadow-[0_0_4px_rgba(250,204,21,0.6)]"
              />
            );
          })}
          {currentDataArray.map((item, idx) => {
            const score = item.totalDelta;
            const yPercent = 35 - (score / maxAbsValue) * 30; 
            const x = `${4 + (idx * (92 / (currentDataArray.length - 1)))}%`;
            return (
              <circle
                key={`dot-${idx}`}
                cx={x}
                cy={`${yPercent}%`}
                r="4"
                fill="#18181b"
                stroke={score >= 0 ? "#10b981" : "#f43f5e"}
                strokeWidth="2"
                className="drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]"
              />
            );
          })}
        </svg>

        {/* Interactive Columns */}
        <div className="absolute inset-0 w-full h-full flex justify-between z-10">
          {currentDataArray.map((item, idx) => {
            const score = item.totalDelta;
            const hasActivation = item.activationScore > 0 || item.domainScore > 0;
            const isPositive = score >= 0;
            const isSelected = selectedDecade === idx;
            const yPercent = 35 - (score / maxAbsValue) * 30; 
            const barHeightPercent = (Math.abs(score) / maxAbsValue) * 100; // Relative to the 30% container
            
            return (
              <div 
                key={idx} 
                onClick={() => setSelectedDecade(isSelected ? null : idx)}
                className="relative flex flex-col items-center w-[8%] h-full group cursor-pointer"
              >
                {/* Hover/Select Background */}
                <div className={`absolute inset-y-0 -inset-x-3 rounded-lg transition-colors ${isSelected ? 'bg-zinc-500/10' : 'group-hover:bg-zinc-500/5'} -z-10`}></div>

                {/* Number Label */}
                <span 
                  className={`absolute text-[11px] font-mono font-bold transition-colors z-30 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}
                  style={{ top: `${yPercent}%`, marginTop: '-22px' }}
                >
                  {isPositive ? '+' : ''}{score}
                </span>

                {/* Bar Chart (anchored to bottom) */}
                <div className="absolute bottom-6 w-full flex justify-center items-end h-[30%]">
                  <div 
                    style={{ height: `${barHeightPercent}%`, minHeight: '4px' }} 
                    className={`w-3.5 rounded-t-sm transition-all duration-300 opacity-80
                      ${isPositive 
                        ? (isSelected ? 'bg-emerald-500 shadow-[0_0_12px_#10b981]' : 'bg-emerald-600 group-hover:bg-emerald-500')
                        : (isSelected ? 'bg-rose-500 shadow-[0_0_12px_#f43f5e]' : 'bg-rose-600 group-hover:bg-rose-500')
                      }`}
                  ></div>
                </div>

                {/* Activation Indicator (moved below the bar) */}
                {hasActivation && (
                  <div className="absolute bottom-0 whitespace-nowrap bg-amber-500/20 border border-amber-500/50 text-amber-500 text-[9px] px-1 py-0.5 rounded flex items-center gap-0.5 shadow-[0_0_8px_rgba(245,158,11,0.3)] z-30">
                    ✨ 得位
                  </div>
                )}

                {/* Decade Label */}
                <div className={`absolute -bottom-11 text-[10px] text-center leading-tight transition-colors w-24 ${isSelected ? 'text-emerald-500 font-bold' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                  <span className="block mb-0.5">{decadeLabels[idx].split('\n')[0]}</span>
                  <span className="block opacity-80">{decadeLabels[idx].split('\n')[1]}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {activeDetail && (
        <div className="mt-10 pt-5 border-t border-zinc-800 animate-slide-up">
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
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
               <div>
                 <div className="text-xs font-bold mb-2 flex justify-between items-center text-zinc-300">
                  <span>🗃️ 一：原局星曜底分</span>
                  <span className="font-mono text-emerald-300/80">{activeDetail.baseScore > 0 ? '+' : ''}{activeDetail.baseScore}</span>
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed">
                  {isOverall 
                    ? '*十二宫底分总和。' 
                    : `*追溯：物理落点【${activeDetail.physicalPalace}】，已提取先天星曜吉凶分(剔除格局)。`}
                </p>
               </div>
            </div>

            <div className={`p-3 rounded-lg border flex flex-col justify-between ${activeDetail.domainScore !== 0 ? 'bg-indigo-950/20 border-indigo-900/50' : 'bg-zinc-900 border-zinc-800'}`}>
              <div>
                <div className="text-xs font-bold mb-2 flex justify-between items-center text-indigo-400/80">
                  <span>🎯 二：大运得位加成</span>
                  <span className="font-mono">{activeDetail.domainScore > 0 ? '+' : ''}{activeDetail.domainScore}</span>
                </div>
                {activeDetail.domainScore !== 0 ? (
                  <ul className="space-y-1 mt-2 max-h-20 overflow-y-auto custom-scrollbar">
                    {activeDetail.domainLogs.map((log, i) => (
                      <li key={i} title={log} className="text-[10px] text-indigo-200/90 flex items-start leading-tight cursor-help">
                        <span className="mr-1.5 mt-0.5 opacity-60">»</span> <span className="truncate">{log}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-[10px] text-zinc-600 italic mt-2">未触发大运宫位得位环境。</div>
                )}
              </div>
            </div>

            <div className={`p-3 rounded-lg border flex flex-col justify-between ${activeDetail.activationScore > 0 ? 'bg-amber-950/20 border-amber-900/50' : 'bg-zinc-900 border-zinc-800'}`}>
              <div>
                <div className="text-xs font-bold mb-2 flex justify-between items-center text-amber-500/80">
                  <span>✨ 三：大运格局分</span>
                  <span className="font-mono">{activeDetail.activationScore > 0 ? '+' : ''}{activeDetail.activationScore}</span>
                </div>
                {activeDetail.activationScore > 0 ? (
                  <ul className="space-y-1 mt-2 max-h-20 overflow-y-auto custom-scrollbar">
                    {activeDetail.activationLogs.map((log, i) => (
                      <li key={i} title={log} className="text-[10px] text-amber-200/90 flex items-start leading-tight cursor-help">
                        <span className="mr-1.5 mt-0.5 opacity-60">»</span> <span className="truncate">{log}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-[10px] text-zinc-600 italic mt-2">未触发大限强宫的主场格局。</div>
                )}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold mb-2 flex justify-between items-center text-blue-400/80">
                  <span>🌪️ 四：大运原局共振</span>
                  <span className={`font-mono ${activeDetail.overlayScore >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {activeDetail.overlayScore > 0 ? '+' : ''}{activeDetail.overlayScore}
                  </span>
                </div>
                {activeDetail.overlayLogs.length > 0 ? (
                  <ul className="space-y-1 h-20 overflow-y-auto pr-1 custom-scrollbar">
                    {activeDetail.overlayLogs.map((log, i) => (
                      <li key={i} title={log} className={`text-[10px] flex justify-between border-b border-zinc-800/50 pb-0.5 ${isOverall ? 'text-zinc-300' : 'text-zinc-400'} cursor-help`}>
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
