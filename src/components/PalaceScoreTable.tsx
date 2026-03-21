import React, { useMemo, useState } from 'react';
import { calculateChartScores, PalaceScore } from '../utils/scoreCalculator';
import { recognizePatterns } from '../utils/patternRecognizer'; 
import PatternDashboard from './PatternDashboard';
import { ChevronDown, ChevronUp, Trophy, AlertTriangle, Minus, Zap, Activity, Award, ShieldAlert, Sparkles } from 'lucide-react';
import { astro } from 'iztro';
import { VCoreEngine, VectorMath, Vector5D } from '../utils/vCoreEngine';
import { PALACE_INTERPRETATIONS } from '../data/vCoreInterpretations';

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

  // 🌟 架构师新增：后台静默提取 5D 向量，供文本解读使用
  const vCoreVectors = useMemo(() => {
    if (!iztroData) return {};
    try {
      let clean = typeof iztroData === 'string' ? iztroData.trim() : JSON.stringify(iztroData);
      if (!clean.startsWith('{')) clean = clean.match(/\{[\s\S]*\}/)?.[0] || '{}';
      const chartObj = JSON.parse(clean);
      if (!chartObj?.rawParams) return {};
      
      const astrolabe = astro.bySolar(chartObj.rawParams.birthday, chartObj.rawParams.birthTime, chartObj.rawParams.gender, true, 'zh-CN');
      
      const basePalaces = astrolabe.palaces.map((p: any) => {
        const mutagens: string[] = [];
        const allStars = [...(p.majorStars || []), ...(p.minorStars || []), ...(p.adjectiveStars || [])];
        allStars.forEach((s: any) => { if (s.mutagen) mutagens.push(s.mutagen); });
        return {
          name: p.name.replace('宫', '').replace('仆役', '交友'),
          branch: p.earthlyBranch,
          ctx: {
            branch: p.earthlyBranch,
            mainStars: p.majorStars?.map((s: any) => s.name) || [],
            minorStars: [...(p.minorStars || []), ...(p.adjectiveStars || [])].map((s: any) => s.name),
            mutagens: mutagens,
            selfMutagen: null
          }
        };
      });

      const vectors: Record<string, Vector5D> = {};
      basePalaces.forEach((p, idx) => {
        const oppIdx = (idx + 6) % 12;
        const tri1Idx = (idx + 4) % 12;
        const tri2Idx = (idx + 8) % 12;
        const prevIdx = (idx + 11) % 12;
        const nextIdx = (idx + 1) % 12;

        const { vector: baseVec, isEmpty } = VCoreEngine.extractBaseVector(p.ctx, basePalaces[oppIdx].ctx);
        const afflictedVec = VCoreEngine.applyAfflictions(baseVec, p.ctx);
        const transformedVec = VCoreEngine.applyTransforms(afflictedVec, p.ctx, isEmpty);
        
        const oppBase = VCoreEngine.extractBaseVector(basePalaces[oppIdx].ctx, p.ctx).vector;
        const tri1Base = VCoreEngine.extractBaseVector(basePalaces[tri1Idx].ctx, basePalaces[(tri1Idx+6)%12].ctx).vector;
        const tri2Base = VCoreEngine.extractBaseVector(basePalaces[tri2Idx].ctx, basePalaces[(tri2Idx+6)%12].ctx).vector;
        
        const fusedVec = VectorMath.clamp({
          F: transformedVec.F*0.5 + oppBase.F*0.25 + tri1Base.F*0.125 + tri2Base.F*0.125,
          P: transformedVec.P*0.5 + oppBase.P*0.25 + tri1Base.P*0.125 + tri2Base.P*0.125,
          E: transformedVec.E*0.5 + oppBase.E*0.25 + tri1Base.E*0.125 + tri2Base.E*0.125,
          S: transformedVec.S*0.5 + oppBase.S*0.25 + tri1Base.S*0.125 + tri2Base.S*0.125,
          W: transformedVec.W*0.5 + oppBase.W*0.25 + tri1Base.W*0.125 + tri2Base.W*0.125,
        });

        const { vector: finalVec } = VCoreEngine.evaluateSpatialPattern(
          p.ctx, basePalaces[oppIdx].ctx, basePalaces[tri1Idx].ctx, basePalaces[tri2Idx].ctx, basePalaces[prevIdx].ctx, basePalaces[nextIdx].ctx, fusedVec
        );
        const fullName = p.name.endsWith('宫') ? p.name : p.name + '宫';
        vectors[fullName] = finalVec;
      });
      return vectors;
    } catch(e) {
      console.error("VCore Vectors Error:", e);
      return {};
    }
  }, [iztroData]);

  // 🌟 架构师新增：根据动态阈值，抽取出对应的解读文案
  const getActiveInterpretations = (palaceName: string, vector: Vector5D | undefined) => {
    if (!vector) return [];
    const cleanName = palaceName.replace(/(本命|大限|流年)/g, '').trim();
    const dictKey = Object.keys(PALACE_INTERPRETATIONS).find(k => 
      k.includes(cleanName) || cleanName.includes(k.replace('宫', ''))
    ) || "命宫";
    
    const interpretations = PALACE_INTERPRETATIONS[dictKey];
    if (!interpretations) return [];

    // 自适应极值提取（哪怕全都是 0.8，也会选出相对最高的一项作为主导特征）
    const maxVal = Math.max(vector.F, vector.P, vector.E, vector.S, vector.W);
    const activeThreshold = maxVal >= 1.2 ? 1.2 : maxVal; 

    const active = [];
    if (vector.F >= activeThreshold && interpretations.F_High) {
      active.push({ label: '财源优势 (F)', text: interpretations.F_High, icon: <Sparkles size={14}/>, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' });
    }
    if (vector.P >= activeThreshold && interpretations.P_High) {
      active.push({ label: '权力掌控 (P)', text: interpretations.P_High, icon: <Zap size={14}/>, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' });
    }
    if (vector.E >= activeThreshold && interpretations.E_High) {
      active.push({ label: '情感羁绊 (E)', text: interpretations.E_High, icon: <Activity size={14}/>, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20' });
    }
    if (vector.S >= activeThreshold && interpretations.S_High) {
      active.push({ label: '稳健底盘 (S)', text: interpretations.S_High, icon: <ShieldAlert size={14}/>, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' });
    }
    // W为反向指标，代表动荡高危
    if (vector.W >= activeThreshold && interpretations.W_High) {
      active.push({ label: '动荡高危 (W)', text: interpretations.W_High, icon: <ShieldAlert size={14}/>, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' });
    }
    return active;
  };

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
                      <div className="col-span-full text-center text-xs text-zinc-600 py-4 border border-zinc-800/50 rounded-lg border-dashed">
                        无星曜算力注入
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. 多维格局穿透 */}
                {p.patternBreakdowns.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-zinc-500 mb-4">
                      <Award size={14} className="text-purple-500/50" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">多维格局穿透 (Pattern Synergy)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {p.patternBreakdowns.map((b, bIdx) => (
                        <div key={bIdx} className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-3 flex justify-between items-center">
                          <div className="flex flex-col">
                            <span className="text-purple-400 font-bold text-xs">{b.reason}</span>
                            <span className="text-[9px] text-purple-500/50 uppercase font-medium">{b.starName}</span>
                          </div>
                          <span className={`text-xs font-mono font-black ${b.score > 0 ? 'text-purple-400' : 'text-rose-400'}`}>
                            {b.score > 0 ? `+${b.score}` : b.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. 三方四正空间矩阵 */}
                <div>
                  <div className="flex items-center gap-2 text-zinc-500 mb-4">
                    <Activity size={14} className="text-blue-500/50" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">三方四正空间矩阵 (Spatial Matrix)</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {p.formulaDetails.map((f, fIdx) => (
                      <div key={fIdx} className="flex items-center justify-between bg-zinc-950/30 p-2 rounded border border-zinc-800/30">
                        <span className="text-xs text-zinc-400 w-24">{f.palaceRole}</span>
                        <span className="text-xs font-bold text-zinc-300 flex-1">{f.palaceName}</span>
                        <div className="flex items-center gap-3 font-mono text-[10px]">
                          <span className="text-zinc-500">{f.rawScore.toFixed(1)} × {f.weight}</span>
                          <span className="text-blue-400 font-bold w-12 text-right">={f.calculatedScore.toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. 🌟 新增：五维宿命共振解析 (5D Resonance Interpretations) */}
                {(() => {
                  const vec = vCoreVectors[p.palaceName];
                  if (!vec) return null;
                  const activeTexts = getActiveInterpretations(p.palaceName, vec);

                  return (
                    <div>
                      <div className="flex items-center gap-2 text-zinc-500 mb-4">
                        <Sparkles size={14} className="text-amber-500/50" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">大师级宫位深度解析 (5D Interpretations)</span>
                      </div>
                      {activeTexts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {activeTexts.map((item, idx) => (
                            <div key={idx} className={`border ${item.border} ${item.bg} rounded-xl p-4 flex flex-col gap-2 hover:brightness-110 transition-all`}>
                              <div className={`flex items-center gap-1.5 text-xs font-bold ${item.color}`}>
                                {item.icon} {item.label}
                              </div>
                              <p className="text-xs text-zinc-300 leading-relaxed">
                                {item.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-zinc-800/30 rounded-lg p-4 border border-zinc-700/50 text-center">
                          <p className="text-xs text-zinc-400 leading-relaxed">
                            该宫位五维能量处于底盘平衡期，未见显著的爆发性红利，亦无致命动荡危机。宜稳扎稳打。
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="w-full flex flex-col gap-8 animate-in fade-in duration-500">
      <PatternDashboard patterns={patterns} />

      <div className="flex flex-col bg-zinc-950/80 border border-zinc-800/60 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="p-5 md:p-6 border-b border-zinc-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <Trophy className="text-emerald-400" size={20} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-zinc-100 font-bold text-lg tracking-tight">十二宫综合战力榜</h3>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.2em] mt-0.5">Palace Power Ranking</p>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6 flex flex-col gap-8">
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3 px-2">
              <Trophy size={18} className="text-emerald-500" />
              <h4 className="text-emerald-500 font-black uppercase text-xs tracking-[0.2em]">🔥 强宫 (人生核心优势盘)</h4>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-emerald-500/30 to-transparent ml-4"></div>
            </div>
            <div className="bg-zinc-900/40 border border-emerald-500/20 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(16,185,129,0.05)]">
              <table className="w-full text-left text-xs border-collapse">
                <tbody>{strongPalaces.map(p => renderPalaceRow(p, 'strong'))}</tbody>
              </table>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3 px-2">
              <Minus size={18} className="text-zinc-500" />
              <h4 className="text-zinc-500 font-black uppercase text-xs tracking-[0.2em]">⚖️ 平宫 (稳定发展领域)</h4>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-zinc-700/50 to-transparent ml-4"></div>
            </div>
            <div className="bg-zinc-900/20 border border-zinc-800/50 rounded-2xl overflow-hidden">
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
    </div>
  );
}
