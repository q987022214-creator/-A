// src/components/PatternDashboard.tsx
import React, { useState } from 'react';
import { PatternResult } from '../utils/patternRecognizer';

interface Props {
  patterns: PatternResult[];
}

export default function PatternDashboard({ patterns }: Props) {
  const [selectedPattern, setSelectedPattern] = useState<PatternResult | null>(null);

  // 🚀 核心过滤：只有标记为 showInDashboard 的格局（即落在优势/典型宫位，满血分数的格局）才会在顶部阵列显示
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
        <span className="text-zinc-500 text-xs">发现 {displayPatterns.length} 个特殊场域</span>
      </div>

      <div className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar">
        {displayPatterns.map((p, idx) => {
          const isGood = p.type === '吉';
          return (
            <div 
              key={idx} 
              onClick={() => setSelectedPattern(p)}
              className={`snap-center shrink-0 w-80 cursor-pointer transition-all hover:scale-105 border rounded-xl p-4 flex flex-col justify-between relative overflow-hidden
                ${isGood 
                  ? 'bg-gradient-to-br from-emerald-950/40 to-black border-emerald-900/50 hover:border-emerald-500/50' 
                  : 'bg-gradient-to-br from-rose-950/40 to-black border-rose-900/50 hover:border-rose-500/50'}`}
            >
              <div className={`absolute -right-6 -top-6 w-24 h-24 blur-3xl rounded-full opacity-20 ${isGood ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-zinc-400 text-xs font-mono bg-zinc-900/80 px-2 py-1 rounded flex items-center gap-1">
                    落在 {p.palaceName} 
                    <span className={`w-2 h-2 rounded-full ${p.isInnerPalace ? 'bg-blue-500' : 'bg-purple-500'}`}></span>
                  </span>
                  <span className={`font-bold text-lg ${isGood ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {p.finalScore > 0 ? '+' : ''}{p.finalScore} <span className="text-xs opacity-50">INDEX</span>
                  </span>
                </div>
                <h3 className={`text-lg font-bold mb-1 ${isGood ? 'text-emerald-100' : 'text-rose-100'}`}>
                  {p.patternName}
                </h3>
                <p className="text-sm text-zinc-400 line-clamp-2 mt-2 border-l-2 pl-2 border-zinc-700">
                  <span className="text-white font-medium">[{p.branch}路]</span> {p.summary}
                </p>
              </div>
              <div className="mt-4 text-xs text-zinc-500 flex justify-between items-center relative z-10">
                <span>点击展开风控报告</span>
                <span>▶</span>
              </div>
            </div>
          );
        })}
      </div>

      {selectedPattern && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedPattern(null)}>
          <div 
            className="w-full max-w-2xl bg-zinc-950 border-t border-zinc-800 rounded-t-2xl p-6 pb-12 animate-slide-up h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto mb-6"></div>
            
            <div className="flex justify-between items-end mb-6 border-b border-zinc-800 pb-4">
              <div>
                <span className="text-zinc-500 text-sm mb-1 block">宫位载体：{selectedPattern.palaceName}</span>
                <h2 className="text-2xl font-bold text-white">{selectedPattern.patternName}</h2>
              </div>
              <div className={`text-3xl font-bold ${selectedPattern.finalScore > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {selectedPattern.finalScore > 0 ? '+' : ''}{selectedPattern.finalScore}
              </div>
            </div>

            {/* 🚀 优势宫位专属特写与全新免责声明 */}
            {selectedPattern.isAdvantage && selectedPattern.advantageText && (
              <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20">
                <div className="flex items-center text-amber-500 font-bold mb-2">
                  <span>🌟 绝对主场特写</span>
                </div>
                <p className="text-amber-100/90 text-sm leading-relaxed mb-3">{selectedPattern.advantageText}</p>
                <div className="pt-2 border-t border-amber-500/20">
                  <p className="text-[10px] text-amber-500/70">
                    *注：该特写仅为宫位泛化基准解释，实际境遇请结合下方星曜吉凶综合研判。
                  </p>
                </div>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-zinc-400 text-xs font-bold tracking-wider mb-3">📍 纯度状态：分支 {selectedPattern.branch} 触发</h3>
              <p className="text-lg text-white font-medium border-l-4 border-zinc-700 pl-3">{selectedPattern.summary}</p>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-zinc-400 text-xs font-bold tracking-wider uppercase">
                  🛡️ 商业级风控与发展建议
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] border font-bold ${
                  selectedPattern.isInnerPalace 
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                    : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                }`}>
                  {selectedPattern.isInnerPalace ? '六内宫 (主自身决策)' : '六外宫 (主环境境遇)'}
                </span>
              </div>
              
              {/* 🚀 完善的内外宫双重释义 */}
              <div className="text-[10px] text-zinc-500 mb-4 ml-1 italic flex flex-col gap-1">
                <span>*六内宫(命财官迁夫子)：代表与自身行为决策、个人直接关联的核心维度。</span>
                <span>*六外宫(兄友疾田福父)：代表客观环境、外界境遇与他人带来的影响。</span>
              </div>
              
              <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4">
                <p className="text-zinc-300 text-sm leading-loose tracking-wide">
                  {selectedPattern.advice}
                </p>
                
                {selectedPattern.supplementaryAdvice && (
                  <div className="pt-4 border-t border-zinc-800/50 mt-4">
                    <h4 className="text-purple-400 text-xs font-bold mb-2 tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                      内外宫环境补充定性
                    </h4>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      {selectedPattern.supplementaryAdvice}
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
