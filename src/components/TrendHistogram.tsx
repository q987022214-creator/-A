// src/components/TrendHistogram.tsx
import React, { useState, useMemo } from 'react';
import { astro } from 'iztro';
import { generateLifeTrendMatrix } from '../utils/dynamicScoreCalculator';

interface Props {
  iztroData: string | null;
}

export default function TrendHistogram({ iztroData }: Props) {
  const [selectedDimension, setSelectedDimension] = useState<number>(-1);

  const trendData = useMemo(() => {
    if (!iztroData) return null;
    try {
      let clean = iztroData.trim();
      if (!clean.startsWith('{')) clean = clean.match(/\{[\s\S]*\}/)?.[0] || '{}';
      const chartObj = JSON.parse(clean);
      if (!chartObj?.rawParams) return null; // 兼容老旧数据拦截

      // 重新生成底层 astrolabe 对象
      const astrolabe = astro.bySolar(
        chartObj.rawParams.birthday, 
        chartObj.rawParams.birthTime, 
        chartObj.rawParams.gender, 
        true, 
        'zh-CN'
      );

      const basePalaces = astrolabe.palaces;
      const palaceNames = basePalaces.map(p => p.name.replace('宫', '') + '宫');
      const decades = astrolabe.palaces.map(p => p.decadal).sort((a,b) => a.range[0] - b.range[0]);

      // 调用动态引擎生成 10 个大限的矩阵
      const matrix = generateLifeTrendMatrix(basePalaces, decades);

      return { ...matrix, palaceNames };
    } catch(e) {
      console.error("生成趋势图失败:", e);
      return null;
    }
  }, [iztroData]);

  if (!trendData) return null;

  const { palaceTrends, overallTrends, decadeLabels, palaceNames } = trendData;
  const currentData = selectedDimension === -1 ? overallTrends : palaceTrends[selectedDimension];
  const maxAbsValue = Math.max(...currentData.map(Math.abs), 10); 

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 w-full mb-6 shadow-lg shadow-black/20">
      <div className="flex justify-between items-end mb-8 border-b border-zinc-800 pb-4">
        <div>
          <h3 className="text-emerald-500 font-bold tracking-widest text-sm flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></span>
            全息百年运限趋势直方图
          </h3>
          <p className="text-zinc-500 text-xs mt-1.5">
            {selectedDimension === -1 
              ? '洞察一生综合起伏（大限命财官总和）' 
              : `洞察【${palaceNames[selectedDimension]}】在各阶段的强弱波动`}
          </p>
        </div>
        
        <select 
          className="bg-zinc-950 border border-zinc-700 text-zinc-300 text-xs rounded-md px-3 py-1.5 outline-none hover:border-emerald-500/50 transition-colors"
          value={selectedDimension}
          onChange={(e) => setSelectedDimension(Number(e.target.value))}
        >
          <option value={-1}>🌟 综合大盘走势</option>
          {palaceNames.map((name, i) => (
            <option key={i} value={i}>📍 {name} 趋势</option>
          ))}
        </select>
      </div>

      <div className="relative h-44 w-full flex items-end justify-between px-2 pt-6">
        {/* 中轴线 0分线 */}
        <div className="absolute left-0 right-0 top-1/2 border-t border-zinc-700 border-dashed w-full -translate-y-1/2 z-0"></div>
        
        {currentData.map((score, idx) => {
          const isPositive = score >= 0;
          // 最高高度控制在 45%，留出顶部空间
          const heightPercent = (Math.abs(score) / maxAbsValue) * 45;
          
          return (
            <div key={idx} className="relative flex flex-col items-center w-[8%] h-full group cursor-pointer z-10">
              
              {/* 正分向上长 */}
              <div className="w-full h-1/2 flex items-end justify-center pb-0.5">
                {isPositive && (
                  <div 
                    style={{ height: `${heightPercent}%`, minHeight: '4px' }} 
                    className="w-full max-w-[24px] bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-sm transition-all duration-300 group-hover:to-emerald-300 group-hover:shadow-[0_0_12px_#10b981]"
                  ></div>
                )}
              </div>

              {/* 负分向下长 */}
              <div className="w-full h-1/2 flex items-start justify-center pt-0.5">
                {!isPositive && (
                  <div 
                    style={{ height: `${heightPercent}%`, minHeight: '4px' }} 
                    className="w-full max-w-[24px] bg-gradient-to-b from-rose-600 to-rose-400 rounded-b-sm transition-all duration-300 group-hover:to-rose-300 group-hover:shadow-[0_0_12px_#f43f5e]"
                  ></div>
                )}
              </div>

              {/* 分数气泡 */}
              <div className={`absolute text-[11px] font-mono font-bold transition-all duration-300 ${isPositive ? 'bottom-1/2 mb-1 group-hover:-translate-y-2 text-emerald-400' : 'top-1/2 mt-1 group-hover:translate-y-2 text-rose-400'}`}>
                {score > 0 ? '+' : ''}{score}
              </div>

              {/* 底部年龄标签 */}
              <div className="absolute -bottom-7 text-[10px] text-zinc-500 whitespace-nowrap group-hover:text-emerald-500 transition-colors">
                {decadeLabels[idx]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
