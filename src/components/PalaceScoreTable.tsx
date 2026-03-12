import React, { useMemo, useState } from 'react';
import { calculateChartScores, PalaceScore } from '../utils/scoreCalculator';
import { ChevronDown, ChevronUp, Info, Trophy, AlertTriangle, Minus, Zap, Activity } from 'lucide-react';

interface PalaceScoreTableProps {
  iztroData: any;
}

export default function PalaceScoreTable({ iztroData }: PalaceScoreTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const scores = useMemo(() => {
    try {
      if (!iztroData) return [];
      let data = iztroData;
      if (typeof data === 'string') {
         let clean = data.trim();
         if (!clean.startsWith('{')) clean = clean.match(/\{[\s\S]*\}/)?.[0] || '{}';
         data = JSON.parse(clean);
      }
      return calculateChartScores(data);
    } catch (e) {
      console.error("量化计算失败", e);
      return [];
    }
  }, [iztroData]);

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
                {p.breakdowns.slice(0, 3).map((b, i) => (
                  <span key={i} className="text-[9px] px-1.5 py-0.5 bg-zinc-900 text-zinc-400 rounded-sm border border-zinc-800 font-medium">
                    {b.starName}
                  </span>
                ))}
                {p.breakdowns.length > 3 && <span className="text-[9px] text-zinc-600 font-bold">+{p.breakdowns.length - 3}</span>}
              </div>
              <span className="text-[10px] text-zinc-600 font-mono tracking-tighter uppercase">Raw: {p.rawScore > 0 ? `+${p.rawScore}` : p.rawScore}</span>
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
                {/* 1. RAW SCORE BREAKDOWN */}
                <div>
                  <div className="flex items-center gap-2 text-zinc-500 mb-4">
                    <Zap size={14} className="text-emerald-500/50" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">本宫得分明细 (Raw Score Breakdown)</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {p.breakdowns.length > 0 ? p.breakdowns.map((b, bIdx) => (
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

                {/* 2. COMPREHENSIVE FORMULA */}
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
                      {p.formula.map((f, fIdx) => (
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
                      
                      <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-end">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">Resonance Summation</span>
                          <span className="text-[10px] text-zinc-500 italic">Σ (Raw_Score * Weight_Factor)</span>
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

                <div className="pt-4 border-t border-zinc-800/50 flex justify-between items-center">
                  <div className="flex gap-2 items-center">
                    <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest">Palace Stars:</span>
                    <span className="text-[10px] text-zinc-400 font-medium italic">{p.starsStr}</span>
                  </div>
                  <div className="flex gap-4 text-[9px] font-mono text-zinc-500 uppercase tracking-tighter">
                    <span>Opposite: 0.5</span>
                    <span>Trine: 0.2</span>
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
      <div className="mb-10 flex items-center justify-between w-full max-w-4xl">
        <div className="flex flex-col">
          <h3 className="text-emerald-400 font-black text-3xl flex items-center gap-4 tracking-tighter uppercase">
            <Trophy className="text-emerald-500" size={28} />
            命格三方四正量化报告
          </h3>
          <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-[0.4em] font-black">Resonance Analysis System v3.0</p>
        </div>
        <div className="text-right hidden sm:block border-l border-zinc-800 pl-6">
          <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest block mb-1">Quantum Resonance</span>
          <div className="flex items-center gap-2 justify-end">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] text-emerald-500/50 font-mono font-bold tracking-widest">STABLE_BUILD_882</span>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col gap-10 w-full max-w-4xl pb-20">
        {/* Strong Palaces Section */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3 px-2">
            <Trophy size={18} className="text-emerald-500" />
            <h4 className="text-emerald-500 font-black uppercase text-xs tracking-[0.2em]">🏆 强宫 (核心优势领域)</h4>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-emerald-500/30 to-transparent ml-4"></div>
          </div>
          <div className="bg-zinc-900/40 border border-emerald-500/20 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.03)]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-emerald-500/5 text-zinc-500 uppercase text-[9px] font-black tracking-[0.15em] border-b border-zinc-800/50">
                <tr>
                  <th className="px-4 py-4">宫位 / Palace</th>
                  <th className="px-4 py-4">星曜组合 / Stars</th>
                  <th className="px-4 py-4">共振分 / Resonance</th>
                  <th className="px-4 py-4">状态 / Status</th>
                  <th className="px-4 py-4 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {strongPalaces.map(p => renderPalaceRow(p, 'strong'))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Neutral Palaces Section */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3 px-2">
            <Minus size={18} className="text-zinc-500" />
            <h4 className="text-zinc-500 font-black uppercase text-xs tracking-[0.2em]">平宫 (中性运行领域)</h4>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-zinc-800 to-transparent ml-4"></div>
          </div>
          <div className="bg-zinc-900/20 border border-zinc-800/50 rounded-2xl overflow-hidden opacity-70 hover:opacity-100 transition-all">
            <table className="w-full text-left text-xs border-collapse">
              <tbody>
                {neutralPalaces.map(p => renderPalaceRow(p, 'neutral'))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Weak Palaces Section */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3 px-2">
            <AlertTriangle size={18} className="text-red-500" />
            <h4 className="text-red-500 font-black uppercase text-xs tracking-[0.2em]">⚠️ 弱宫 (短板需关注领域)</h4>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-red-500/30 to-transparent ml-4"></div>
          </div>
          <div className="bg-zinc-900/40 border border-red-500/20 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.03)]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-red-500/5 text-zinc-500 uppercase text-[9px] font-black tracking-[0.15em] border-b border-zinc-800/50">
                <tr>
                  <th className="px-4 py-4">宫位 / Palace</th>
                  <th className="px-4 py-4">星曜组合 / Stars</th>
                  <th className="px-4 py-4">共振分 / Resonance</th>
                  <th className="px-4 py-4">状态 / Status</th>
                  <th className="px-4 py-4 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {weakPalaces.map(p => renderPalaceRow(p, 'weak'))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      
      <div className="mt-4 p-8 bg-emerald-950/10 border border-emerald-500/10 rounded-3xl w-full max-w-4xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-6 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
          <Trophy size={120} className="text-emerald-500" />
        </div>
        <h4 className="text-[10px] font-black text-emerald-500 uppercase mb-4 tracking-[0.4em] flex items-center gap-3">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          AI 命格共振深度分析报告
        </h4>
        <p className="text-sm text-zinc-400 leading-relaxed relative z-10 font-medium">
          基于三方四正加权共振算法，您的 <span className="text-emerald-400 font-black">{strongPalaces[0].palaceName}</span> 以 <span className="text-emerald-400 font-mono text-xl tracking-tighter">{strongPalaces[0].finalScore.toFixed(1)}</span> 的高分位居榜首。
          这意味着该领域不仅自身能量充沛（底分 {strongPalaces[0].rawScore}），且得到了对宫与三合宫的强力共振支撑。
          建议优先在 <span className="text-emerald-400 underline decoration-emerald-500/30 underline-offset-8 font-bold">{strongPalaces.map(p => p.palaceName).join('、')}</span> 相关事务上投入精力。
          反之，<span className="text-red-400 font-black">{weakPalaces[weakPalaces.length-1].palaceName}</span> 得分最低，受负向共振影响较大，需防范连锁性的损耗风险。
        </p>
      </div>
    </div>
  );
}
