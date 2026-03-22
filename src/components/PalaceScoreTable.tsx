import React, { useMemo, useState } from 'react';
import { calculateChartScores, PalaceScore } from '../utils/scoreCalculator';
import { recognizePatterns } from '../utils/patternRecognizer'; 
import PatternDashboard from './PatternDashboard';
import { Trophy, Zap, Activity, Award, ShieldAlert, Sparkles, TrendingDown } from 'lucide-react';
import { astro } from 'iztro';
import { VCoreEngine, VectorMath, Vector5D } from '../utils/vCoreEngine';
import { PALACE_INTERPRETATIONS, PALACE_LOW_INTERPRETATIONS } from '../data/vCoreInterpretations';

interface PalaceScoreTableProps {
  iztroData: any;
}

const STANDARD_ORDER = [
  "命宫", "兄弟", "夫妻", "子女", "财帛", "疾厄", 
  "迁移", "交友", "官禄", "田宅", "福德", "父母"
];

export default function PalaceScoreTable({ iztroData }: PalaceScoreTableProps) {
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
    } catch (e) { return []; }
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
    } catch (e) { return []; }
  }, [iztroData, patterns]);

  const vCoreVectors = useMemo(() => {
    if (!iztroData) return {};
    try {
      let data = iztroData;
      if (typeof data === 'string') {
        let clean = data.trim();
        if (!clean.startsWith('{')) clean = clean.match(/\{[\s\S]*\}/)?.[0] || '{}';
        data = JSON.parse(clean);
      }
      
      let astrolabe;
      if (data.rawParams) {
        astrolabe = astro.bySolar(data.rawParams.birthday, data.rawParams.birthTime, data.rawParams.gender, true, 'zh-CN');
      } else if (data.palaces) {
        astrolabe = data;
      } else {
        return {};
      }

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
        const fullName = p.name === '命' ? '命宫' : (p.name.endsWith('宫') ? p.name : p.name + '宫');
        vectors[fullName] = finalVec;
      });
      return vectors;
    } catch(e) { return {}; }
  }, [iztroData]);

  const getActiveInterpretations = (palaceName: string, vector: Vector5D | undefined) => {
    if (!vector) return [];
    const cleanName = palaceName.replace(/(本命|大限|流年)/g, '').trim();
    const dictKey = Object.keys(PALACE_INTERPRETATIONS).find(k => 
      k.includes(cleanName) || cleanName.includes(k.replace('宫', ''))
    ) || "命宫";
    
    const interpretations = PALACE_INTERPRETATIONS[dictKey];
    const lowInterpretations = PALACE_LOW_INTERPRETATIONS[dictKey];
    
    const active = [];
    
    // 高分判定：若维度 >= 1.2
    if (interpretations) {
      if (vector.F >= 1.2) active.push({ label: '财源优势 (F↑)', text: interpretations.F_High, icon: <Sparkles size={14}/>, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' });
      if (vector.P >= 1.2) active.push({ label: '权力掌控 (P↑)', text: interpretations.P_High, icon: <Zap size={14}/>, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' });
      if (vector.E >= 1.2) active.push({ label: '情感羁绊 (E↑)', text: interpretations.E_High, icon: <Activity size={14}/>, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20' });
      if (vector.S >= 1.2) active.push({ label: '稳健底盘 (S↑)', text: interpretations.S_High, icon: <ShieldAlert size={14}/>, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' });
      if (vector.W >= 1.2) active.push({ label: '动荡高危 (W↑)', text: interpretations.W_High, icon: <ShieldAlert size={14}/>, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' });
    }

    // 低分判定：若维度 < 0.5
    if (lowInterpretations) {
      if (vector.F < 0.5) active.push({ label: '财源收缩 (F↓)', text: lowInterpretations.F_Low, icon: <TrendingDown size={14}/>, color: 'text-zinc-400', bg: 'bg-zinc-900/50', border: 'border-zinc-700/50' });
      if (vector.P < 0.5) active.push({ label: '权力弱化 (P↓)', text: lowInterpretations.P_Low, icon: <TrendingDown size={14}/>, color: 'text-zinc-400', bg: 'bg-zinc-900/50', border: 'border-zinc-700/50' });
      if (vector.E < 0.5) active.push({ label: '情感疏离 (E↓)', text: lowInterpretations.E_Low, icon: <TrendingDown size={14}/>, color: 'text-zinc-400', bg: 'bg-zinc-900/50', border: 'border-zinc-700/50' });
      if (vector.S < 0.5) active.push({ label: '底气不足 (S↓)', text: lowInterpretations.S_Low, icon: <TrendingDown size={14}/>, color: 'text-zinc-400', bg: 'bg-zinc-900/50', border: 'border-zinc-700/50' });
      if (vector.W < 0.5) active.push({ label: '轨迹固化 (W↓)', text: lowInterpretations.W_Low, icon: <TrendingDown size={14}/>, color: 'text-zinc-400', bg: 'bg-zinc-900/50', border: 'border-zinc-700/50' });
    }

    return active;
  };

  if (!scores || scores.length === 0) {
    return (
      <div className="p-10 text-zinc-500 text-center flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-zinc-800 border-t-emerald-500 animate-spin"></div>
        <p className="font-mono text-xs uppercase tracking-widest">Initializing...</p>
      </div>
    );
  }

  const sortedScores = [...scores].sort((a, b) => b.finalScore - a.finalScore);
  const getTier = (palaceName: string) => {
    const idx = sortedScores.findIndex(s => s.palaceName === palaceName);
    if (idx < 4) return 'strong';
    if (idx < 8) return 'neutral';
    return 'weak';
  };

  const orderedData = STANDARD_ORDER.map(shortName => {
    const searchName = shortName === "命宫" ? "命宫" : shortName + "宫";
    const fallbackName = searchName === "交友宫" ? "仆役宫" : searchName;
    const found = scores.find(s => s.palaceName === searchName || s.palaceName === fallbackName);
    return { shortName, scoreData: found || scores[0] }; 
  });

  const activeItem = orderedData.find(item => item.scoreData.palaceName === expandedRow) || orderedData[0];
  const activePalace = activeItem.scoreData;
  const activeTier = getTier(activePalace.palaceName);

  return (
    <div className="p-4 sm:p-6 w-full h-full overflow-auto custom-scrollbar bg-zinc-950 flex flex-col items-center">
      <div className="mb-6 w-full max-w-3xl">
        <PatternDashboard patterns={patterns} />
      </div>

      <div className="w-full max-w-3xl mb-4">
        <h3 className="text-emerald-400 font-black text-xl flex items-center gap-2 tracking-tighter uppercase mb-1">
          <Trophy className="text-emerald-500" size={20} />
          十二宫量化战力雷达
        </h3>
        <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold">Resonance Grid System</p>
      </div>
      
      <div className="w-full max-w-3xl bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-3 mb-6 shadow-lg backdrop-blur-sm">
        <div className="grid grid-cols-6 gap-2">
          {orderedData.map((item) => {
            const p = item.scoreData;
            const tier = getTier(p.palaceName);
            const isSelected = expandedRow === p.palaceName;
            
            let colorClasses = '';
            if (tier === 'strong') {
              colorClasses = isSelected ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20';
            } else if (tier === 'weak') {
              colorClasses = isSelected ? 'bg-red-500 text-white border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20';
            } else {
              colorClasses = isSelected ? 'bg-zinc-200 text-black border-zinc-300 shadow-[0_0_8px_rgba(228,228,231,0.4)]' : 'bg-zinc-800/50 text-zinc-300 border-zinc-700 hover:bg-zinc-700/50';
            }

            return (
              <button
                key={item.shortName}
                onClick={() => setExpandedRow(isSelected ? null : p.palaceName)}
                className={`py-2 px-1 rounded-md border text-xs sm:text-sm font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${colorClasses}`}
              >
                <span>{item.shortName}</span>
                <span className="text-[9px] font-mono opacity-80">{p.finalScore.toFixed(1)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {expandedRow && activePalace && (
        <div className={`w-full max-w-3xl bg-zinc-900/80 border-t-4 rounded-xl shadow-2xl p-5 animate-in slide-in-from-top-2 fade-in duration-200 ${
          activeTier === 'strong' ? 'border-emerald-500' : activeTier === 'weak' ? 'border-red-500' : 'border-zinc-500'
        }`}>
          
          <div className="flex justify-between items-center mb-6 pb-3 border-b border-zinc-800/80">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-white tracking-widest">{activeItem.shortName}</h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-widest ${
                activeTier === 'strong' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                activeTier === 'weak' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
              }`}>
                {activeTier === 'strong' ? '核心强宫' : activeTier === 'weak' ? '薄弱风险' : '平稳过渡'}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black font-mono tracking-tighter ${
                activeTier === 'strong' ? 'text-emerald-400' : activeTier === 'weak' ? 'text-red-400' : 'text-zinc-300'
              }`}>
                {activePalace.finalScore.toFixed(1)}
              </span>
              <span className="text-[10px] text-zinc-500 uppercase font-bold">综合战力</span>
            </div>
          </div>

          <div className="flex flex-col gap-8">
            
            {/* 0. 🌟 五维宿命共振解析 (高低分语义预警) */}
            {(() => {
              const vec = vCoreVectors[activePalace.palaceName];
              if (!vec) return null;
              const activeTexts = getActiveInterpretations(activePalace.palaceName, vec);
              if (activeTexts.length === 0) return null;
              
              return (
                <div>
                  <div className="flex items-center gap-2 text-cyan-500/70 mb-4">
                    <Sparkles size={14} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">五维多维状态解析 (5D Resonance Analysis)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeTexts.map((item, idx) => (
                      <div key={idx} className={`border ${item.border} ${item.bg} rounded-lg p-3 flex flex-col gap-1.5`}>
                        <div className={`flex items-center gap-1.5 text-xs font-bold ${item.color}`}>
                          {item.icon} {item.label}
                        </div>
                        <p className="text-[11px] text-zinc-300 leading-relaxed">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* 1. 数据骨架：星曜与格局 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 text-zinc-500 mb-2">
                  <Zap size={12} className="text-emerald-500/50" />
                  <span className="text-[10px] font-black uppercase tracking-widest">基础星曜 (Base)</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {activePalace.baseBreakdowns.length > 0 ? activePalace.baseBreakdowns.map((b, bIdx) => (
                    <div key={bIdx} className="bg-zinc-950/50 border border-zinc-800/50 rounded-md p-2 flex justify-between items-center">
                      <span className="text-zinc-300 font-bold text-[11px]">{b.starName}</span>
                      <span className={`text-[11px] font-mono font-bold ${b.score > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {b.score > 0 ? `+${b.score}` : b.score}
                      </span>
                    </div>
                  )) : (
                    <div className="text-xs text-zinc-600 italic py-1">无显著增减分项</div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-zinc-500 mb-2">
                  <Award size={12} className="text-purple-500/50" />
                  <span className="text-[10px] font-black uppercase tracking-widest">高维格局 (Pattern)</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {activePalace.patternBreakdowns.length > 0 ? activePalace.patternBreakdowns.map((b, bIdx) => (
                    <div key={bIdx} className={`border rounded-md p-2 flex justify-between items-center ${b.score > 0 ? 'bg-amber-950/20 border-amber-500/30' : 'bg-purple-950/20 border-purple-500/30'}`}>
                      <span className={`font-bold text-[11px] ${b.score > 0 ? 'text-amber-400' : 'text-purple-400'}`}>{b.starName}</span>
                      <span className={`text-[11px] font-mono font-bold ${b.score > 0 ? 'text-amber-400' : 'text-purple-400'}`}>
                        {b.score > 0 ? `+${b.score}` : b.score}
                      </span>
                    </div>
                  )) : (
                     <div className="text-xs text-zinc-600 italic py-1">未引动特殊格局</div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. 三方四正推演公式区 */}
            <div>
              <div className="flex items-center gap-2 text-zinc-500 mb-2">
                <Activity size={12} className="text-blue-500/50" />
                <span className="text-[10px] font-black uppercase tracking-widest">三方四正矩阵 (Matrix)</span>
              </div>
              <div className="bg-zinc-950/40 rounded-lg p-3 border border-zinc-800/50 relative">
                <div className="flex flex-col gap-2 relative z-10">
                  {activePalace.formulaDetails.map((f, fIdx) => (
                    <div key={fIdx} className="flex items-center justify-between group text-[10px] sm:text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500 font-bold uppercase w-12">{f.palaceRole}</span>
                        <span className="text-zinc-300 w-16">{f.palaceName}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-zinc-400">{f.rawScore.toFixed(1)}</span>
                        <span className="text-zinc-600">×</span>
                        <span className="text-zinc-500 font-bold">{f.weight.toFixed(1)}</span>
                        <span className="text-emerald-400/80 font-black w-10 text-right">={f.calculatedScore.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
      
      <div className="h-20 w-full"></div>
    </div>
  );
}
