import React, { useMemo, useState } from 'react';
import { calculateChartScores, PalaceScore } from '../utils/scoreCalculator';
import { recognizePatterns } from '../utils/patternRecognizer'; 
import PatternDashboard from './PatternDashboard';
import { ChevronDown, ChevronUp, Trophy, AlertTriangle, Minus, Zap, Activity, Award } from 'lucide-react';

interface PalaceScoreTableProps {
  iztroData: any;
}

export default function PalaceScoreTable({ iztroData }: PalaceScoreTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const patterns = useMemo(() => {
    try {
      if (!iztroData) return [];
      let data = iztroData;
      if (typeof data === 'string') {
         let clean = data.trim();
         if (!clean.startsWith('{')) clean = clean.match(/\{[\s\S]*\}/)?.[0] || '{}';
         data = JSON.parse(clean);
      }
      return recognizePatterns(data);
    } catch (e) {
      return [];
    }
  }, [iztroData]);

  const scores = useMemo(() => {
    try {
      if (!iztroData) return [];
      let data = iztroData;
      if (typeof data === 'string') {
         let clean = data.trim();
         if (!clean.startsWith('{')) clean = clean.match(/\{[\s\S]*\}/)?.[0] || '{}';
         data = JSON.parse(clean);
      }
      return calculateChartScores(data, patterns);
    } catch (e) {
      console.error("量化计算失败", e);
      return [];
    }
  }, [iztroData, patterns]);

  if (!scores || scores.length === 0) {
    return (
      <div className="p-10 text-zinc-500 text-center flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-zinc-800 border-t-emerald-500 animate-spin"></div>
        <p className="font-mono text-xs uppercase tracking-widest">Initializing Resonance Analysis...</p>
      </div>
    );
  }

  const strongPalaces = scores.slice(0, 4);
  const neutralPalaces = scores.slice(4, 8);
  const weakPalaces = scores.slice(8, 12);

  const renderPalaceRow = (p: PalaceScore, groupType: 'strong' | 'neutral' | 'weak') => {
    const isExpanded = expandedRow === p.palaceName;
    const statusColor = groupType === 'strong' ? 'text-emerald-400' : groupType === 'weak' ? 'text-red-400' : 'text-zinc-400';
    const statusBg = groupType === 'strong' ? 'bg-emerald-500/10' : groupType === 'weak' ? 'bg-red-500/10' : 'bg-zinc-500/10';
    const statusBorder = groupType === 'strong' ? 'border-emerald-500/20' : groupType === 'weak' ? 'border-red-500/20' : 'border-zinc-500/20';
    const statusLabel = groupType === 'strong' ? '强宫' : groupType === 'weak' ? '弱宫' : '平宫';

    return (
      <React.Fragment key={p.palaceName}>
        <tr 
          className={`hover:bg-zinc-800/40 transition-all cursor-pointer border-b border-zinc-800/30 ${isExpanded ? 'bg-zinc-800/30' : ''}`}
          onClick={() => setExpandedRow(isExpanded ? null : p.palaceName)}
        >
          <td className="px-4 py-4">
            <div className="flex flex-col">
              <span className="text-zinc-100 font-bold text-sm tracking-tight">{p.palaceName}</span>
              <span className="text-[10px] text-zinc-500 font-mono uppercase">{p.heavenlyStem}{p.earthlyBranch}</span>
            </div>
          </td>
          <td className="px-4 py-4">
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap gap-1">
                {p.baseBreakdowns.slice(0, 3).map((b, i) => (
                  <span key={i} className="text-[9px] px-1.5 py-0.5 bg-zinc-900 text-zinc-400 rounded-sm border border-zinc-800 font-medium">
                    {b.starName}
                  </span>
                ))}
                {p.baseBreakdowns.length > 3 && <span className="text-[9px] text-zinc-600 font-bold">+{p.baseBreakdowns.length - 3}</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-600 font-mono tracking-tighter uppercase">Base: {p.baseScore > 0 ? `+${p.baseScore}` : p.baseScore}</span>
                {p.patternScore !== 0 && (
                  <span className={`text-[10px] font-mono tracking-tighter ${p.patternScore > 0 ? 'text-amber-500/80' : 'text-purple-500/80'}`}>
                    Pat: {p.patternScore > 0 ? `+${p.patternScore}` : p.patternScore}
                  </span>
                )}
              </div>
            </div>
          </td>
          <td className="px-4 py-4">
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-black font-mono tracking-tighter ${statusColor}`}>
                {p.finalScore.toFixed(1)}
              </span>
              <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-tighter">Index</span>
            </div>
          </td>
          <td className="px-4 py-4">
            <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${statusBg} ${statusColor} ${statusBorder} uppercase tracking-widest`}>
              {statusLabel}
            </span>
          </td>
          <td className="px-4 py-4 text-zinc-600">
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </td>
        </tr>
        {isExpanded && (
          <tr className={`bg-zinc-900/80 border-l-4 ${groupType === 'strong' ? 'border-emerald-500/50' : groupType === 'weak' ? 'border-red-500/50' : 'border-zinc-500/50'}`}>
            <td colSpan={5} className="px-6 py-6">
              <div className="flex flex-col gap-8">
                
                {/* 1. 基础星曜算力区 */}
                <div>
                  <div className="flex items-center gap-2 text-zinc-500 mb-4">
                    <Zap size={14} className="text-emerald-500/50" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">底层星曜算力 (Base Score Breakdown)</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {p.baseBreakdowns.length > 0 ? p.baseBreakdowns.map((b, bIdx) => (
                      <div key={bIdx} className="bg-zinc-950/50 border border-zinc-800/50 rounded-lg p-3 flex justify-between items-center group hover:border-zinc-700 transition-colors">
                        <div className="flex flex-col">
                          <span className="text-zinc-200 font-bold text-xs">{b.starName}</span>
                          <span className="text-[9px] text-zinc-500 uppercase font-medium">{b.reason}</span>
                        </div>
                        <span className={`text-xs font-mono font-black ${b.score > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {b.score > 0 ? `+${b.score}` : b.score}
                        </span>
                      </div>
                    )) : (
                      <div className="col-span-full text-zinc-600 italic text-[10px] py-2">宫位能量平稳，无显著加减分项</div>
                    )}
                  </div>
                </div>

                {/* 2. 格局加持区 (如果有) */}
                {p.patternBreakdowns.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-amber-500/70 mb-4">
                      <Award size={14} />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">高维格局加持 (Pattern Buffs)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {p.patternBreakdowns.map((b, bIdx) => (
                        <div key={bIdx} className={`border rounded-lg p-3 flex justify-between items-center ${b.score > 0 ? 'bg-amber-950/20 border-amber-500/30' : 'bg-purple-950/20 border-purple-500/30'}`}>
                          <div className="flex flex-col">
                            <span className={`font-bold text-xs ${b.score > 0 ? 'text-amber-300' : 'text-purple-300'}`}>{b.starName}</span>
                            <span className="text-[10px] text-zinc-400 uppercase font-medium">{b.reason}</span>
                          </div>
                          <span className={`text-sm font-mono font-black ${b.score > 0 ? 'text-amber-400' : 'text-purple-400'}`}>
                            {b.score > 0 ? `+${b.score}` : b.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. 三方四正推演公式区 */}
                <div>
                  <div className="flex items-center gap-2 text-zinc-500 mb-4">
                    <Activity size={14} className="text-emerald-500/50" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">三方四正推演公式 (Comprehensive Formula)</span>
                  </div>
                  <div className="bg-zinc-950/40 rounded-xl p-6 border border-zinc-800/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
                      <Activity size={100} />
                    </div>
                    
                    <div className="flex flex-col gap-4 relative z-10">
                      {p.formulaDetails.map((f, fIdx) => (
                        <div key={fIdx} className="flex items-center gap-4 group">
                          <div className="w-24 flex flex-col">
                            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-tighter">{f.palaceRole}</span>
                            <span className="text-xs text-zinc-300 font-bold truncate">{f.palaceName}</span>
                          </div>
                          <div className="flex-1 h-[1px] bg-zinc-800/50 group-hover:bg-zinc-700 transition-colors"></div>
                          <div className="flex items-center gap-3 font-mono">
                            <span className="text-sm text-zinc-400">{f.rawScore.toFixed(1)}</span>
                            <span className="text-[10px] text-zinc-600">×</span>
                            <span className="text-[10px] text-zinc-500 font-bold">{f.weight.toFixed(1)}</span>
                            <span className="text-[10px] text-zinc-700">=</span>
                            <span className="text-sm text-emerald-400/80 font-black w-12 text-right">{f.calculatedScore.toFixed(1)}</span>
                          </div>
                        </div>
                      ))}
                      
                      {/* 公式终极汇总区 */}
                      <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-col gap-2">
                        <div className="flex justify-between items-center text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                          <span>Σ 矩阵衰减分 (Matrix)</span>
                          <span className="text-sm font-bold text-zinc-300">{p.matrixScore.toFixed(1)}</span>
                        </div>
                        {p.patternScore !== 0 && (
                          <div className={`flex justify-between items-center text-[10px] uppercase tracking-widest font-mono ${p.patternScore > 0 ? 'text-amber-500/80' : 'text-purple-500/80'}`}>
                            <span>+ 核心格局分 (Pattern Buff)</span>
                            <span className="text-sm font-bold">{p.patternScore > 0 ? '+' : ''}{p.patternScore.toFixed(1)}</span>
                          </div>
                        )}
                        <div className="pt-3 border-t border-zinc-800/50 flex justify-between items-end mt-1">
                          <div className="flex flex-col">
                            <span className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">Resonance Summation</span>
                            <span className="text-[10px] text-zinc-500 italic">Matrix + Pattern</span>
                          </div>
                          <div className="flex items-baseline gap-3">
                            <span className="text-[10px] text-zinc-600 font-mono">=</span>
                            <span className="text-3xl font-black text-emerald-400 font-mono tracking-tighter leading-none">
                              {p.finalScore.toFixed(1)}
                            </span>
                            <span className="text-[10px] text-emerald-500/50 font-black uppercase tracking-widest mb-1">Index</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="p-6 w-full h-full overflow-auto custom-scrollbar bg-zinc-950 flex flex-col items-center">
      <div className="mb-6 w-full max-w-4xl">
        <PatternDashboard patterns={patterns} />
      </div>

      <div className="mb-10 flex items-center justify-between w-full max-w-4xl">
        <div className="flex flex-col">
          <h3 className="text-emerald-400 font-black text-3xl flex items-center gap-4 tracking-tighter uppercase">
            <Trophy className="text-emerald-500" size={28} />
            命格三方四正量化报告
          </h3>
          <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-[0.4em] font-black">Resonance Analysis System v3.0</p>
        </div>
      </div>
      
      <div className="flex flex-col gap-10 w-full max-w-4xl pb-20">
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3 px-2">
            <Trophy size={18} className="text-emerald-500" />
            <h4 className="text-emerald-500 font-black uppercase text-xs tracking-[0.2em]">🏆 强宫 (核心优势领域)</h4>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-emerald-500/30 to-transparent ml-4"></div>
          </div>
          <div className="bg-zinc-900/40 border border-emerald-500/20 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <tbody>{strongPalaces.map(p => renderPalaceRow(p, 'strong'))}</tbody>
            </table>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3 px-2">
            <Minus size={18} className="text-zinc-500" />
            <h4 className="text-zinc-500 font-black uppercase text-xs tracking-[0.2em]">平宫 (中性运行领域)</h4>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-zinc-800 to-transparent ml-4"></div>
          </div>
          <div className="bg-zinc-900/20 border border-zinc-800/50 rounded-2xl overflow-hidden opacity-70">
            <table className="w-full text-left text-xs border-collapse">
              <tbody>{neutralPalaces.map(p => renderPalaceRow(p, 'neutral'))}</tbody>
            </table>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3 px-2">
            <AlertTriangle size={18} className="text-red-500" />
            <h4 className="text-red-500 font-black uppercase text-xs tracking-[0.2em]">⚠️ 弱宫 (短板需关注领域)</h4>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-red-500/30 to-transparent ml-4"></div>
          </div>
          <div className="bg-zinc-900/40 border border-red-500/20 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <tbody>{weakPalaces.map(p => renderPalaceRow(p, 'weak'))}</tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
