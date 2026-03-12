import React, { useMemo, useState } from 'react';
import { calculatePalaceScores, PalaceScore } from '../utils/scoreCalculator';
import { ChevronDown, ChevronUp, Info, Trophy, AlertTriangle, Minus } from 'lucide-react';

interface PalaceScoreTableProps {
  iztroData: any;
}

export default function PalaceScoreTable({ iztroData }: PalaceScoreTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const data = useMemo(() => {
    if (!iztroData) return null;
    try {
      let clean = iztroData;
      if (typeof clean === 'string') {
        if (!clean.startsWith('{')) clean = clean.match(/\{[\s\S]*\}/)?.[0] || '{}';
        return JSON.parse(clean);
      }
      return clean;
    } catch (e) {
      console.error("Parse error in table:", e);
      return null;
    }
  }, [iztroData]);

  const scores = useMemo(() => {
    if (!data) return [];
    return calculatePalaceScores(data);
  }, [data]);

  const sortedScores = useMemo(() => {
    return [...scores].sort((a, b) => b.comprehensiveScore - a.comprehensiveScore);
  }, [scores]);

  if (!data || scores.length === 0) {
    return <div className="p-10 text-zinc-500 text-center flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-full border-2 border-zinc-800 border-t-emerald-500 animate-spin"></div>
      <p>正在解析命盘量化数据...</p>
    </div>;
  }

  const strongPalaces = sortedScores.slice(0, 4);
  const neutralPalaces = sortedScores.slice(4, 8);
  const weakPalaces = sortedScores.slice(8, 12);

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
              <span className="text-zinc-100 font-bold text-sm">{p.palaceName}</span>
              <span className="text-[10px] text-zinc-500 font-mono">{p.heavenlyStem}{p.earthlyBranch}</span>
            </div>
          </td>
          <td className="px-4 py-4">
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap gap-1">
                {p.breakdowns.slice(0, 3).map((b, i) => (
                  <span key={i} className="text-[9px] px-1 bg-zinc-800 text-zinc-400 rounded-sm border border-zinc-700/50">
                    {b.starName}
                  </span>
                ))}
                {p.breakdowns.length > 3 && <span className="text-[9px] text-zinc-600">...</span>}
              </div>
              <span className="text-[10px] text-zinc-600 font-mono">本宫基础分: {p.rawScore > 0 ? `+${p.rawScore}` : p.rawScore}</span>
            </div>
          </td>
          <td className="px-4 py-4">
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-black font-mono tracking-tighter ${statusColor}`}>
                {p.comprehensiveScore.toFixed(1)}
              </span>
              <span className="text-[9px] text-zinc-600 uppercase font-bold">Index</span>
            </div>
          </td>
          <td className="px-4 py-4">
            <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${statusBg} ${statusColor} ${statusBorder}`}>
              {statusLabel}
            </span>
          </td>
          <td className="px-4 py-4 text-zinc-600">
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </td>
        </tr>
        {isExpanded && (
          <tr className={`bg-zinc-900/80 border-l-4 ${groupType === 'strong' ? 'border-emerald-500/50' : groupType === 'weak' ? 'border-red-500/50' : 'border-zinc-500/50'}`}>
            <td colSpan={5} className="px-6 py-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-zinc-500 mb-1">
                  <Info size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">本宫得分明细 (Raw Score Breakdown)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {p.breakdowns.length > 0 ? p.breakdowns.map((b, bIdx) => (
                    <div key={bIdx} className="bg-zinc-950/50 border border-zinc-800/50 rounded p-2 flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-zinc-300 font-medium text-[11px]">{b.starName}</span>
                        <span className="text-[9px] text-zinc-500">{b.reason}</span>
                      </div>
                      <span className={`text-[10px] font-mono font-bold ${b.score > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {b.score > 0 ? `+${b.score}` : b.score}
                      </span>
                    </div>
                  )) : (
                    <div className="col-span-full text-zinc-600 italic text-[10px]">无显著加减分项</div>
                  )}
                </div>
                <div className="mt-2 pt-2 border-t border-zinc-800/50 flex justify-between items-center">
                  <span className="text-[9px] text-zinc-500 italic">宫内星曜: {p.starsStr}</span>
                  <div className="flex gap-4 text-[9px] font-mono text-zinc-400">
                    <span>对宫权重: 0.8</span>
                    <span>三合权重: 0.6</span>
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
    <div className="p-4 w-full h-full overflow-auto custom-scrollbar bg-zinc-950 flex flex-col items-center">
      <div className="mb-8 flex items-center justify-between w-full max-w-4xl">
        <div className="flex flex-col">
          <h3 className="text-emerald-400 font-black text-2xl flex items-center gap-3 tracking-tighter">
            <Trophy className="text-emerald-500" size={24} />
            命格三方四正量化报告
          </h3>
          <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-[0.2em] font-bold">Resonance Analysis System v3.0</p>
        </div>
        <div className="text-right hidden sm:block">
          <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest block">Quantum Resonance</span>
          <span className="text-[10px] text-emerald-500/50 font-mono">STABLE_BUILD_882</span>
        </div>
      </div>
      
      <div className="flex flex-col gap-8 w-full max-w-4xl">
        {/* Strong Palaces Section */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-2">
            <Trophy size={16} className="text-emerald-500" />
            <h4 className="text-emerald-500 font-bold uppercase text-xs tracking-widest">🏆 强宫 (核心优势领域)</h4>
            <div className="h-[1px] flex-1 bg-emerald-500/20 ml-2"></div>
          </div>
          <div className="bg-zinc-900/50 border border-emerald-500/20 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.05)]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-emerald-500/5 text-zinc-500 uppercase text-[9px] font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3">宫位</th>
                  <th className="px-4 py-3">星曜组合与单宫底分</th>
                  <th className="px-4 py-3">三方四正综合分</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {strongPalaces.map(p => renderPalaceRow(p, 'strong'))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Neutral Palaces Section */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-2">
            <Minus size={16} className="text-zinc-500" />
            <h4 className="text-zinc-500 font-bold uppercase text-xs tracking-widest">平宫 (中性运行领域)</h4>
            <div className="h-[1px] flex-1 bg-zinc-800 ml-2"></div>
          </div>
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden opacity-60 hover:opacity-100 transition-opacity">
            <table className="w-full text-left text-xs border-collapse">
              <tbody>
                {neutralPalaces.map(p => renderPalaceRow(p, 'neutral'))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Weak Palaces Section */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-2">
            <AlertTriangle size={16} className="text-red-500" />
            <h4 className="text-red-500 font-bold uppercase text-xs tracking-widest">⚠️ 弱宫 (短板需关注领域)</h4>
            <div className="h-[1px] flex-1 bg-red-500/20 ml-2"></div>
          </div>
          <div className="bg-zinc-900/50 border border-red-500/20 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(239,68,68,0.05)]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-red-500/5 text-zinc-500 uppercase text-[9px] font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3">宫位</th>
                  <th className="px-4 py-3">星曜组合与单宫底分</th>
                  <th className="px-4 py-3">三方四正综合分</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {weakPalaces.map(p => renderPalaceRow(p, 'weak'))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      
      <div className="mt-12 p-6 bg-emerald-900/5 border border-emerald-900/20 rounded-2xl w-full max-w-4xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <Trophy size={80} className="text-emerald-500" />
        </div>
        <h4 className="text-[10px] font-black text-emerald-500 uppercase mb-3 tracking-[0.3em] flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
          AI 命格共振深度分析
        </h4>
        <p className="text-sm text-zinc-400 leading-relaxed relative z-10">
          基于三方四正加权算法，您的 <span className="text-emerald-400 font-bold">{strongPalaces[0].palaceName}</span> 以 <span className="text-emerald-400 font-mono text-lg">{strongPalaces[0].comprehensiveScore}</span> 的高分位居榜首，
          这意味着该领域不仅自身能量充沛，且得到了对宫与三合宫的强力共振支撑。
          建议优先在 <span className="text-emerald-400 underline decoration-emerald-500/30 underline-offset-4">{strongPalaces.map(p => p.palaceName).join('、')}</span> 相关事务上投入精力。
          反之，<span className="text-red-400 font-bold">{weakPalaces[weakPalaces.length-1].palaceName}</span> 得分最低，受负向共振影响较大，需防范连锁性的损耗风险。
        </p>
      </div>
    </div>
  );
}


