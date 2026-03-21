import React, { useMemo, useState } from 'react';
import { calculateChartScores, PalaceScore } from '../utils/scoreCalculator';
import { recognizePatterns } from '../utils/patternRecognizer'; 
import PatternDashboard from './PatternDashboard';
import { Trophy, AlertTriangle, Minus, Zap, Activity, Award, ShieldAlert, Sparkles } from 'lucide-react';
import { astro } from 'iztro';
import { VCoreEngine, VectorMath, Vector5D } from '../utils/vCoreEngine';
import { PALACE_INTERPRETATIONS } from '../data/vCoreInterpretations';

interface PalaceScoreTableProps {
  iztroData: any;
}

// 固定的十二宫标准排盘顺序
const STANDARD_ORDER = [
  "命宫", "兄弟宫", "夫妻宫", "子女宫", "财帛宫", "疾厄宫", 
  "迁移宫", "交友宫", "官禄宫", "田宅宫", "福德宫", "父母宫"
];

export default function PalaceScoreTable({ iztroData }: PalaceScoreTableProps) {
  // 默认展开命宫，避免初次进入时页面空旷
  const [expandedRow, setExpandedRow] = useState<string | null>('命宫');

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

  // 后台静默提取 5D 向量
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

  const getActiveInterpretations = (palaceName: string, vector: Vector5D | undefined) => {
    if (!vector) return [];
    const cleanName = palaceName.replace(/(本命|大限|流年)/g, '').trim();
    const dictKey = Object.keys(PALACE_INTERPRETATIONS).find(k => 
      k.includes(cleanName) || cleanName.includes(k.replace('宫', ''))
    ) || "命宫";
    
    const interpretations = PALACE_INTERPRETATIONS[dictKey];
    if (!interpretations) return [];

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

  // 1. 将分数进行全局排名，用于判定强弱颜色
  const sortedScores = [...scores].sort((a, b) => b.finalScore - a.finalScore);
  const getTier = (palaceName: string) => {
    const idx = sortedScores.findIndex(s => s.palaceName === palaceName);
    if (idx < 4) return 'strong';
    if (idx < 8) return 'neutral';
    return 'weak';
  };

  // 2. 将数组强制按照紫微斗数标准顺序（命兄夫子...）重排
  const orderedScores = [...scores].sort((a, b) => {
    const normalizeName = (name: string) => name.replace('仆役', '交友').replace('宫', '') + '宫';
    const idxA = STANDARD_ORDER.indexOf(normalizeName(a.palaceName));
    const idxB = STANDARD_ORDER.indexOf(normalizeName(b.palaceName));
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });

  const activePalace = orderedScores.find(p => p.palaceName === expandedRow);
  const activeTier = activePalace ? getTier(activePalace.palaceName) : 'neutral';

  return (
    <div className="p-4 sm:p-6 w-full h-full overflow-auto custom-scrollbar bg-zinc-950 flex flex-col items-center">
      <div className="mb-6 w-full max-w-4xl">
        <PatternDashboard patterns={patterns} />
      </div>

      <div className="mb-6 flex items-center justify-between w-full max-w-4xl">
        <div className="flex flex-col">
          <h3 className="text-emerald-400 font-black text-xl sm:text-2xl flex items-center gap-3 tracking-tighter uppercase">
            <Trophy className="text-emerald-500" size={24} />
            命格十二宫穿透报告
          </h3>
          <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-[0.4em] font-black">Resonance Analysis System</p>
        </div>
      </div>
      
      {/* 🚀 极简双排 6x2 固定网格 (高度压缩 50%) */}
      <div className="w-full max-w-4xl bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-3 sm:p-4 mb-6 shadow-xl backdrop-blur-md">
        <div className="grid grid-cols-6 gap-2 sm:gap-3">
          {orderedScores.map(p => {
            const tier = getTier(p.palaceName);
            const isSelected = expandedRow === p.palaceName;
            
            // UI 颜色逻辑
            let colorClasses = '';
            if (tier === 'strong') {
              colorClasses = isSelected ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20';
            } else if (tier === 'weak') {
              colorClasses = isSelected ? 'bg-red-500 text-white border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20';
            } else {
              colorClasses = isSelected ? 'bg-zinc-200 text-black border-zinc-300 shadow-[0_0_10px_rgba(228,228,231,0.5)]' : 'bg-zinc-800/50 text-zinc-300 border-zinc-700 hover:bg-zinc-700/50';
            }

            return (
              <button
                key={p.palaceName}
                onClick={() => setExpandedRow(isSelected ? null : p.palaceName)}
                className={`py-2 sm:py-3 px-1 rounded-lg border text-[11px] sm:text-sm font-bold transition-all flex items-center justify-center tracking-widest ${colorClasses}`}
              >
                {/* 仅保留宫位名字，极致紧凑 */}
                {p.palaceName.replace('宫', '')}
              </button>
            );
          })}
        </div>
      </div>

      {/* 🎯 展开后的宫位详细数据面板 */}
      {activePalace && (
        <div className={`w-full max-w-4xl bg-zinc-900/80 border-t-4 rounded-xl shadow-2xl p-5 sm:p-8 animate-in slide-in-from-top-4 fade-in duration-300 ${
          activeTier === 'strong' ? 'border-emerald-500' : activeTier === 'weak' ? 'border-red-500' : 'border-zinc-500'
        }`}>
          
          <div className="flex justify-between items-center mb-8 pb-4 border-b border-zinc-800">
            <h2 className="text-2xl font-black text-white tracking-widest">{activePalace.palaceName}</h2>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black font-mono tracking-tighter ${
                activeTier === 'strong' ? 'text-emerald-400' : activeTier === 'weak' ? 'text-red-400' : 'text-zinc-300'
              }`}>
                {activePalace.finalScore.toFixed(1)}
              </span>
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">综合算力</span>
            </div>
          </div>

          <div className="flex flex-col gap-8">
            
            {/* 1. 🌟 优先级最高：五维宿命共振解析 */}
            {(() => {
              const vec = vCoreVectors[activePalace.palaceName];
              if (!vec) return null;
              const activeTexts = getActiveInterpretations(activePalace.palaceName, vec);

              return (
                <div>
                  <div className="flex items-center gap-2 text-amber-500/70 mb-4">
                    <Sparkles size={16} />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">大师级宫位深度解析 (5D Interpretations)</span>
                  </div>
                  {activeTexts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {activeTexts.map((item, idx) => (
                        <div key={idx} className={`border ${item.border} ${item.bg} rounded-xl p-4 flex flex-col gap-2 hover:brightness-110 transition-all`}>
                          <div className={`flex items-center gap-1.5 text-xs font-bold ${item.color}`}>
                            {item.icon} {item.label}
                          </div>
                          <p className="text-sm text-zinc-300 leading-relaxed">
                            {item.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-zinc-800/30 rounded-lg p-5 border border-zinc-700/50 text-center">
                      <p className="text-sm text-zinc-400 leading-relaxed">
                        该宫位五维能量处于底盘平衡期，未见显著的爆发性红利，亦无致命动荡危机。宜稳扎稳打。
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 2. 基础星曜算力区 */}
            <div>
              <div className="flex items-center gap-2 text-zinc-500 mb-4">
                <Zap size={14} className="text-emerald-500/50" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">底层星曜算力 (Base Score Breakdown)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {activePalace.baseBreakdowns.length > 0 ? activePalace.baseBreakdowns.map((b, bIdx) => (
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
                    宫位能量平稳，无显著加减分项
                  </div>
                )}
              </div>
            </div>

            {/* 3. 格局加持区 */}
            {activePalace.patternBreakdowns.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-zinc-500 mb-4">
                  <Award size={14} className="text-purple-500/50" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">多维格局穿透 (Pattern Buffs)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activePalace.patternBreakdowns.map((b, bIdx) => (
                    <div key={bIdx} className={`border rounded-lg p-3 flex justify-between items-center ${b.score > 0 ? 'bg-amber-950/20 border-amber-500/30' : 'bg-purple-950/20 border-purple-500/30'}`}>
                      <div className="flex flex-col">
                        <span className={`font-bold text-xs ${b.score > 0 ? 'text-amber-400' : 'text-purple-400'}`}>{b.reason}</span>
                        <span className="text-[10px] text-zinc-500 uppercase font-medium mt-0.5">{b.starName}</span>
                      </div>
                      <span className={`text-sm font-mono font-black ${b.score > 0 ? 'text-amber-400' : 'text-purple-400'}`}>
                        {b.score > 0 ? `+${b.score}` : b.score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. 三方四正推演公式区 */}
            <div>
              <div className="flex items-center gap-2 text-zinc-500 mb-4">
                <Activity size={14} className="text-blue-500/50" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">三方四正空间矩阵 (Spatial Matrix)</span>
              </div>
              <div className="bg-zinc-950/40 rounded-xl p-4 sm:p-6 border border-zinc-800/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-[0.02] pointer-events-none">
                  <Activity size={120} />
                </div>
                
                <div className="flex flex-col gap-3 sm:gap-4 relative z-10">
                  {activePalace.formulaDetails.map((f, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-2 sm:gap-4 group">
                      <div className="w-20 sm:w-24 flex flex-col shrink-0">
                        <span className="text-[9px] text-zinc-500 font-black uppercase tracking-tighter">{f.palaceRole}</span>
                        <span className="text-[11px] sm:text-xs text-zinc-300 font-bold truncate">{f.palaceName}</span>
                      </div>
                      <div className="flex-1 h-[1px] bg-zinc-800/50 group-hover:bg-zinc-700 transition-colors"></div>
                      <div className="flex items-center gap-2 sm:gap-3 font-mono shrink-0">
                        <span className="text-xs sm:text-sm text-zinc-400">{f.rawScore.toFixed(1)}</span>
                        <span className="text-[9px] sm:text-[10px] text-zinc-600">×</span>
                        <span className="text-[9px] sm:text-[10px] text-zinc-500 font-bold">{f.weight.toFixed(1)}</span>
                        <span className="text-[9px] sm:text-[10px] text-zinc-700">=</span>
                        <span className="text-xs sm:text-sm text-emerald-400/80 font-black w-8 sm:w-10 text-right">{f.calculatedScore.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                  
                  {/* 公式终极汇总区 */}
                  <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                      <span>Σ 矩阵衰减分 (Matrix)</span>
                      <span className="text-sm font-bold text-zinc-300">{activePalace.matrixScore.toFixed(1)}</span>
                    </div>
                    {activePalace.patternScore !== 0 && (
                      <div className={`flex justify-between items-center text-[10px] uppercase tracking-widest font-mono ${activePalace.patternScore > 0 ? 'text-amber-500/80' : 'text-purple-500/80'}`}>
                        <span>+ 核心格局分 (Pattern Buff)</span>
                        <span className="text-sm font-bold">{activePalace.patternScore > 0 ? '+' : ''}{activePalace.patternScore.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
      
      {/* 底部留白 */}
      <div className="h-20 w-full"></div>
    </div>
  );
}
