// src/components/PatternDashboard.tsx
import React, { useState } from 'react';
import { PatternResult } from '../utils/patternRecognizer';

const getTitleColor = (score: number) => {
  if (score >= 3) return 'bg-gradient-to-b from-yellow-100 via-yellow-400 to-yellow-700 bg-clip-text text-transparent drop-shadow-sm font-black tracking-tight';
  if (score >= 1.5) return 'bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent';
  if (score > 0) return 'text-emerald-400';
  return 'text-zinc-100';
};

const getBranchBadgeColor = (branch: string) => {
  switch (branch) {
    case 'A': return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    case 'B': return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    case 'C': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    default: return 'bg-zinc-800 text-zinc-400 border border-zinc-700';
  }
};

interface Props {
  patterns: PatternResult[];
}

export default function PatternDashboard({ patterns }: Props) {
  const [selectedPattern, setSelectedPattern] = useState<PatternResult | null>(null);

  // 🚀 核心过滤：只展示落在优势/典型宫位的大格
  const displayPatterns = patterns.filter(p => p.showInDashboard);

  if (!displayPatterns || displayPatterns.length === 0) {
    return (
      <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 text-center text-sm text-zinc-500">
        盘面气机隐潜，未触发显性大格，请以十二宫常态共振为主。（隐性格局已在底层影响具体宫位分数）
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-emerald-500 font-bold tracking-widest text-sm flex items-center">
          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 shadow-[0_0_8px_#10b981]"></span>
          核心格局探测阵列 (DETECTED PATTERNS)
        </h2>
        <span className="text-zinc-500 text-xs">发现 {displayPatterns.length} 个典型场域</span>
      </div>

      <div className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar">
        {displayPatterns.map((p, idx) => {
          const isGood = p.type === '吉';
          // 根据分支设置不同的角标颜色
          const branchColor = p.branch === 'A' ? 'bg-rose-600' : (p.branch === 'B' ? 'bg-amber-600' : 'bg-emerald-600');
          
          return (
            <div 
              key={idx} 
              onClick={() => setSelectedPattern(p)}
              className={`snap-center shrink-0 w-80 cursor-pointer transition-all hover:scale-105 border rounded-xl p-4 flex flex-col justify-between relative overflow-hidden
                ${isGood ? 'bg-zinc-900 border-emerald-900/50 hover:border-emerald-500/50' : 'bg-zinc-900 border-rose-900/50 hover:border-rose-500/50'}`}
            >
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-zinc-400 text-xs font-mono bg-zinc-950 px-2 py-1 rounded flex items-center gap-1">
                    落在 {p.palaceName} 
                    <span className={`w-2 h-2 rounded-full ${p.isInnerPalace ? 'bg-blue-500' : 'bg-purple-500'}`}></span>
                  </span>
                  <span className={`font-bold text-lg ${isGood ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {p.finalScore > 0 ? '+' : ''}{p.finalScore} <span className="text-xs opacity-50">INDEX</span>
                  </span>
                </div>
                <h3 className="text-lg font-bold mb-1 text-zinc-100">
                  {p.patternName}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[10px] text-white px-1.5 py-0.5 rounded font-bold ${branchColor}`}>
                    {p.branch} 路
                  </span>
                  <p className="text-xs text-zinc-400 truncate">
                    {p.summary}
                  </p>
                </div>
              </div>
              <div className="mt-4 text-xs text-zinc-500 flex justify-between items-center relative z-10 border-t border-zinc-800 pt-2">
                <span>点击查看详细诊断</span>
                <span>▶</span>
              </div>
            </div>
          );
        })}
      </div>

      {selectedPattern && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6" onClick={() => setSelectedPattern(null)}>
          <div 
            className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl p-6 pb-8 animate-slide-up max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto mb-6"></div>
            
            <div className="flex justify-between items-end mb-6 border-b border-zinc-800/80 pb-4">
              <div>
                <span className="text-zinc-500 text-sm mb-1 block">宫位载体：{selectedPattern.palaceName}</span>
                <h2 className={`text-2xl font-bold ${getTitleColor(selectedPattern.finalScore)}`}>
                  {selectedPattern.patternName}
                </h2>
              </div>
              <div className={`text-3xl font-bold ${selectedPattern.finalScore > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {selectedPattern.finalScore > 0 ? '+' : ''}{selectedPattern.finalScore}
              </div>
            </div>

            {/* 2. 纯度状态 (Moved up, more prominent) */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-zinc-400 text-xs font-bold tracking-wider">📍 纯度状态：</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${getBranchBadgeColor(selectedPattern.branch)}`}>
                  分支 {selectedPattern.branch} 触发
                </span>
              </div>
              <p className="text-lg text-zinc-100 font-medium border-l-2 border-zinc-700 pl-3">{selectedPattern.summary}</p>
            </div>

            {/* 3. 商业级风控与发展建议 (Main content area) */}
            <div className="mb-6">
              <h3 className="text-zinc-400 text-xs font-bold tracking-wider uppercase mb-3 flex items-center gap-2">
                <span className="text-emerald-500">🛡️</span> 商业级风控与发展建议
              </h3>
              
              <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-4">
                <p className="text-zinc-200 text-sm leading-relaxed tracking-wide">
                  {selectedPattern.advice}
                </p>
                
                {selectedPattern.supplementaryAdvice && (
                  <div className="pt-4 border-t border-zinc-800/50 mt-4">
                    <h4 className="text-zinc-500 text-[10px] font-bold mb-1.5 tracking-widest uppercase">
                      环境补充定性
                    </h4>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      {selectedPattern.supplementaryAdvice}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 4. 优势宫位泛化解析 (Moved down, less prominent) */}
            {selectedPattern.isAdvantage && selectedPattern.advantageText && (
              <div className="mb-6 p-4 rounded-lg bg-zinc-900/30 border border-zinc-800/50">
                <div className="flex items-center text-zinc-400 font-bold mb-2 text-xs">
                  <span className="text-amber-500/70 mr-2">📌</span> 优势宫位泛化解析
                </div>
                <p className="text-zinc-500 text-xs leading-relaxed mb-2">{selectedPattern.advantageText}</p>
                <p className="text-[10px] text-rose-500/60 italic">
                  *注：该特写仅为宫位泛化基准解释，实际境遇请结合星曜吉凶状态综合研判。
                </p>
              </div>
            )}

            {/* 5. 六内外宫完整释义 (Subtle footnote) */}
            <div className="mt-8 pt-4 border-t border-zinc-800/30">
              <div className="text-[10px] text-zinc-600 flex flex-col gap-1">
                <span className={selectedPattern.isInnerPalace ? 'text-blue-400/70' : ''}>• 六内宫(命财官迁夫子)：主自身行为决策与直接掌控。</span>
                <span className={!selectedPattern.isInnerPalace ? 'text-purple-400/70' : ''}>• 六外宫(兄友疾田福父)：主客观环境、外界境遇与六亲影响。</span>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
