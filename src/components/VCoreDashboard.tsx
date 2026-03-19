// src/components/VCoreDashboard.tsx
import React, { useState, useMemo } from 'react';
import { astro } from 'iztro';
import { VCoreEngine, VectorMath, PalaceContext, Vector5D } from '../utils/vCoreEngine';
import { VCoreInterpreter } from '../utils/vCoreInterpreter';
import { SEMANTIC_MAPPINGS } from '../utils/vCoreData';

interface Props {
  iztroData: string | null;
  onAskAI?: (prompt: string, displayMsg: string, payload: string) => void;
}

const DIMENSIONS = [
  { key: 'F', name: '财富/资源', color: 'bg-emerald-500', text: 'text-emerald-400', stroke: '#10b981', desc: '物质获取与现金流状态' },
  { key: 'P', name: '权力/执行', color: 'bg-amber-500', text: 'text-amber-400', stroke: '#f59e0b', desc: '职场实权与抗压行动力' },
  { key: 'E', name: '情感/人际', color: 'bg-fuchsia-500', text: 'text-fuchsia-400', stroke: '#d946ef', desc: '感情浓烈度与交际魅力' },
  { key: 'S', name: '稳定/防御', color: 'bg-blue-500', text: 'text-blue-400', stroke: '#3b82f6', desc: '底盘稳定性与风险抵御' },
  { key: 'W', name: '动荡/波动', color: 'bg-rose-500', text: 'text-rose-400', stroke: '#f43f5e', desc: '变动频率与不可控因素' },
];

export default function VCoreDashboard({ iztroData, onAskAI }: Props) {
  const [selectedPalaceIdx, setSelectedPalaceIdx] = useState<number>(0);
  const [showDataProof, setShowDataProof] = useState<boolean>(false);

  // 1. 底层引擎测算全量数据
  const vCoreData = useMemo(() => {
    if (!iztroData) return null;
    try {
      let clean = iztroData.trim();
      if (!clean.startsWith('{')) clean = clean.match(/\{[\s\S]*\}/)?.[0] || '{}';
      const chartObj = JSON.parse(clean);
      if (!chartObj?.rawParams) return null;

      const astrolabe = astro.bySolar(chartObj.rawParams.birthday, chartObj.rawParams.birthTime, chartObj.rawParams.gender, true, 'zh-CN');
      
      const palaces = astrolabe.palaces.map((p: any) => ({
        name: p.name.replace('宫', ''),
        branch: p.earthlyBranch,
        ctx: {
          branch: p.earthlyBranch,
          mainStars: p.majorStars?.map((s: any) => s.name) || [],
          minorStars: [...(p.minorStars || []), ...(p.adjectiveStars || [])].map((s: any) => s.name),
          mutagens: p.mutagen ? [p.mutagen] : [],
          selfMutagen: null
        } as PalaceContext
      }));

      return palaces.map((p, idx) => {
        const oppIdx = (idx + 6) % 12;
        const tri1Idx = (idx + 4) % 12;
        const tri2Idx = (idx + 8) % 12;
        const prevIdx = (idx + 11) % 12;
        const nextIdx = (idx + 1) % 12;

        const { vector: baseVec, isEmpty } = VCoreEngine.extractBaseVector(p.ctx, palaces[oppIdx].ctx);
        const afflictedVec = VCoreEngine.applyAfflictions(baseVec, p.ctx);
        const transformedVec = VCoreEngine.applyTransforms(afflictedVec, p.ctx, isEmpty);
        
        const oppBase = VCoreEngine.extractBaseVector(palaces[oppIdx].ctx, p.ctx).vector;
        const tri1Base = VCoreEngine.extractBaseVector(palaces[tri1Idx].ctx, palaces[(tri1Idx+6)%12].ctx).vector;
        const tri2Base = VCoreEngine.extractBaseVector(palaces[tri2Idx].ctx, palaces[(tri2Idx+6)%12].ctx).vector;
        
        const fusedVec = VectorMath.clamp({
          F: transformedVec.F*0.5 + oppBase.F*0.25 + tri1Base.F*0.125 + tri2Base.F*0.125,
          P: transformedVec.P*0.5 + oppBase.P*0.25 + tri1Base.P*0.125 + tri2Base.P*0.125,
          E: transformedVec.E*0.5 + oppBase.E*0.25 + tri1Base.E*0.125 + tri2Base.E*0.125,
          S: transformedVec.S*0.5 + oppBase.S*0.25 + tri1Base.S*0.125 + tri2Base.S*0.125,
          W: transformedVec.W*0.5 + oppBase.W*0.25 + tri1Base.W*0.125 + tri2Base.W*0.125,
        });

        const { vector: finalVec, tags } = VCoreEngine.evaluateSpatialPattern(
          p.ctx, palaces[oppIdx].ctx, palaces[tri1Idx].ctx, palaces[tri2Idx].ctx, palaces[prevIdx].ctx, palaces[nextIdx].ctx, fusedVec
        );
        
        // 🚀 调用增强版解读引擎
        const interpretation = VCoreInterpreter.getBaseInterpretation(p.ctx.mainStars, p.name);
        const mutagenInterpretations = VCoreInterpreter.getMutagenInterpretation(p.ctx.mutagens, p.name);
        const auspiciousInterpretations = VCoreInterpreter.getAuspiciousInterpretation(p.ctx.minorStars, p.name);
        const maleficInterpretations = VCoreInterpreter.getMaleficInterpretation(p.ctx.minorStars, p.name);

        return { ...p, stars: p.ctx.mainStars.join('') || '空宫', baseVec, finalVec, tags, interpretation, mutagenInterpretations, auspiciousInterpretations, maleficInterpretations };
      });
    } catch(e) { return null; }
  }, [iztroData]);

  if (!vCoreData) return null;
  const activePalace = vCoreData[selectedPalaceIdx];
  const { interpretation, mutagenInterpretations, auspiciousInterpretations, maleficInterpretations } = activePalace;

  // 🚀 封装 AI 对话触发器
  const handleAskAI = (type: 'depth' | 'mutagen' | 'scene' | 'malefic') => {
    if (!onAskAI) return;
    
    let prompt = "";
    let displayMsg = "";
    const semanticInfo = SEMANTIC_MAPPINGS[`${activePalace.name}宫`] || "";
    
    let payload = JSON.stringify({
      palace: activePalace.name,
      stars: activePalace.stars,
      finalVec: activePalace.finalVec,
      tags: activePalace.tags,
      mutagens: activePalace.ctx.mutagens,
      malefics: activePalace.maleficInterpretations.map(m => m.tag),
      semanticInfo
    });

    if (type === 'depth') {
      prompt = `请针对我的【${activePalace.name}宫】进行深度解析。主星是${activePalace.stars}，目前的量化维度是：${JSON.stringify(activePalace.finalVec)}。请结合这些数据，给我一些更深层的命理建议。`;
      displayMsg = `🔮 深度解析：${activePalace.name}宫的宿命共振`;
    } else if (type === 'mutagen') {
      prompt = `我的【${activePalace.name}宫】触发了四化干预：${activePalace.ctx.mutagens.join('、')}。请详细解释这会对我的运势产生怎样的动态影响？`;
      displayMsg = `⚡ 动态干预：${activePalace.name}宫的四化能量`;
    } else if (type === 'malefic') {
      prompt = `我的【${activePalace.name}宫】出现了煞星：${activePalace.maleficInterpretations.map(m => m.tag).join('、')}。请问这些煞星会如何破坏我的运势，我该如何化解？`;
      displayMsg = `⚔️ 煞星化解：${activePalace.name}宫的负面能量`;
    } else {
      prompt = `针对【${activePalace.name}宫】的建议“${interpretation.scene_tips}”，我该如何在日常生活中具体落地执行？请给出 3 条可操作的建议。`;
      displayMsg = `💡 行动指南：${activePalace.name}宫的避凶落地`;
    }

    onAskAI(prompt, displayMsg, payload);
  };

  // 画辅助雷达图的方法
  const getRadarPath = (vec: Vector5D, scale: number = 50) => {
    const maxVal = 1.5;
    return ['F', 'P', 'E', 'S', 'W'].map((key, i) => {
      const r = (vec[key as keyof Vector5D] / maxVal) * scale;
      const a = [0, 72, 144, 216, 288][i] * (Math.PI / 180);
      return `${80 + r * Math.sin(a)},${80 - r * Math.cos(a)}`;
    }).join(' ');
  };

  return (
    <div className="flex flex-col md:flex-row h-[80vh] bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden font-sans shadow-2xl">
      
      {/* ⬅️ 左侧：极简十二宫导航菜单 */}
      <div className="w-full md:w-64 bg-zinc-900/50 border-r border-zinc-800 flex flex-col overflow-y-auto custom-scrollbar">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/80 sticky top-0 z-10">
          <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">
            紫微命理诊断书
          </h2>
          <p className="text-[10px] text-zinc-500 mt-1">V-Core 深度语义引擎</p>
        </div>
        
        <div className="p-2 space-y-1">
          {vCoreData.map((palace, idx) => {
            const isSelected = selectedPalaceIdx === idx;
            return (
              <button
                key={idx}
                onClick={() => setSelectedPalaceIdx(idx)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all flex justify-between items-center group
                  ${isSelected ? 'bg-amber-500/10 border border-amber-500/30' : 'hover:bg-zinc-800 border border-transparent'}`}
              >
                <div>
                  <div className={`text-sm font-bold ${isSelected ? 'text-amber-400' : 'text-zinc-300 group-hover:text-white'}`}>
                    {palace.name}宫
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{palace.stars}</div>
                </div>
                <div className={`text-xs ${isSelected ? 'text-amber-500' : 'text-zinc-700'}`}>▶</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ➡️ 右侧：核心诊断报告区 (纯人话，重文案) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-zinc-950">
        
        {/* 头部大结论 */}
        <div className="p-8 border-b border-zinc-800/60 relative overflow-hidden">
          {/* 背景装饰光晕 */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-white">{activePalace.name}宫</span>
              <span className="px-3 py-1 rounded bg-zinc-800 text-amber-400 text-sm font-mono border border-zinc-700">
                {activePalace.stars}
              </span>
            </div>
            {onAskAI && (
              <button 
                onClick={() => handleAskAI('depth')}
                className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-all flex items-center gap-2"
              >
                ✨ 深度解析
              </button>
            )}
          </div>

          {/* 🎯 您亲自撰写的 Core Conclusion 放在最震撼的 C 位 */}
          <p className="text-lg text-zinc-200 leading-relaxed font-medium">
            “{interpretation.core_conclusion}”
          </p>

          {/* 🚀 新增：四化动态干预显示区 */}
          {mutagenInterpretations.length > 0 && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <span className="w-8 h-[1px] bg-zinc-800"></span>
                四化动态干预
                <span className="w-8 h-[1px] bg-zinc-800"></span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {mutagenInterpretations.map((mi, i) => (
                  <div key={i} className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start group hover:border-amber-500/30 transition-all">
                    <div className="shrink-0 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black border border-amber-500/20">
                      {mi.tag}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">
                        {mi.description}
                      </p>
                    </div>
                    {onAskAI && (
                      <button 
                        onClick={() => handleAskAI('mutagen')}
                        className="shrink-0 text-[10px] text-zinc-600 hover:text-amber-400 font-bold transition-colors"
                      >
                        问 AI 详情 →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 🚀 新增：八吉星能量插件 */}
          {auspiciousInterpretations.length > 0 && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <span className="w-8 h-[1px] bg-zinc-800"></span>
                八吉星能量插件
                <span className="w-8 h-[1px] bg-zinc-800"></span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {auspiciousInterpretations.map((ai, i) => (
                  <div key={i} className="bg-emerald-900/10 border border-emerald-500/20 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start group hover:border-emerald-500/40 transition-all">
                    <div className="shrink-0 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black border border-emerald-500/20">
                      {ai.tag}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">
                        {ai.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 🚀 新增：六煞星刺客 */}
          {maleficInterpretations.length > 0 && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <span className="w-8 h-[1px] bg-zinc-800"></span>
                六煞星刺客
                <span className="w-8 h-[1px] bg-zinc-800"></span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {maleficInterpretations.map((mi, i) => (
                  <div key={i} className="bg-rose-900/10 border border-rose-500/20 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start group hover:border-rose-500/40 transition-all">
                    <div className="shrink-0 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-black border border-rose-500/20">
                      {mi.tag}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">
                        {mi.description}
                      </p>
                    </div>
                    {onAskAI && (
                      <button 
                        onClick={() => handleAskAI('malefic')}
                        className="shrink-0 text-[10px] text-zinc-600 hover:text-rose-400 font-bold transition-colors"
                      >
                        问 AI 化解 →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 如果有 S/A 级格局，显示在这里作为警示/高光 */}
          {activePalace.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {activePalace.tags.map((tag, i) => (
                <span key={i} className="px-3 py-1.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold">
                  ⚠️ 触发格局：{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 主体分析：优势 vs 劣势 */}
        <div className="p-8 grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* 优势列表 */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-500 rounded-sm"></span> 核心优势与天赋
            </h3>
            <ul className="space-y-3">
              {interpretation.advantage.map((text, i) => (
                <li key={i} className="flex gap-3 text-sm text-zinc-300 leading-relaxed bg-emerald-950/20 p-3 rounded-lg border border-emerald-900/30">
                  <span className="text-emerald-500 mt-0.5">✦</span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* 劣势列表 */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-rose-500 rounded-sm"></span> 潜在风险与短板
            </h3>
            <ul className="space-y-3">
              {interpretation.shortcoming.map((text, i) => (
                <li key={i} className="flex gap-3 text-sm text-zinc-300 leading-relaxed bg-rose-950/20 p-3 rounded-lg border border-rose-900/30">
                  <span className="text-rose-500 mt-0.5">⊗</span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 底部：场景化行动建议 (Scene Tips) */}
        <div className="px-8 pb-8">
          <div className="bg-amber-950/20 border-l-4 border-amber-500 p-5 rounded-r-xl relative group">
            <h3 className="text-sm font-bold text-amber-400 mb-2">💡 趋吉避凶指南</h3>
            <p className="text-sm text-amber-200/80 leading-relaxed mb-4">
              {interpretation.scene_tips}
            </p>
            {onAskAI && (
              <button 
                onClick={() => handleAskAI('scene')}
                className="text-[10px] font-bold text-amber-500/60 hover:text-amber-400 flex items-center gap-1 transition-colors"
              >
                如何具体落地执行？点击咨询 AI 导师 →
              </button>
            )}
          </div>
        </div>

        {/* 极客专属：底层物理数据证明 */}
        <div className="px-8 pb-8">
          <button 
            onClick={() => setShowDataProof(!showDataProof)}
            className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
          >
            {showDataProof ? '▼ 收起底层算法证明' : '▶ 查看底层向量依据 (极客模式)'}
          </button>
          
          {showDataProof && (
            <div className="mt-4 p-6 bg-zinc-900/50 rounded-xl border border-zinc-800 flex flex-col sm:flex-row gap-8 items-center animate-fade-in">
              <div className="shrink-0">
                <svg viewBox="0 0 160 160" className="w-32 h-32 opacity-90">
                  {[0.5, 1.0, 1.5].map((l, i) => <polygon key={i} points={getRadarPath({F:l,P:l,E:l,S:l,W:l}, 50)} fill="none" stroke="#3f3f46" strokeWidth="0.5" strokeDasharray="2,2" />)}
                  {[0, 72, 144, 216, 288].map((a, i) => <line key={i} x1="80" y1="80" x2={80 + 50 * Math.sin(a * Math.PI / 180)} y2={80 - 50 * Math.cos(a * Math.PI / 180)} stroke="#3f3f46" strokeWidth="0.5" />)}
                  <polygon points={getRadarPath(activePalace.finalVec)} fill="rgba(245, 158, 11, 0.2)" stroke="#f59e0b" strokeWidth="2" />
                  {DIMENSIONS.map((dim, i) => {
                    const r = 68; const a = [0, 72, 144, 216, 288][i] * (Math.PI / 180);
                    return <text key={i} x={80 + r * Math.sin(a)} y={80 - r * Math.cos(a)} fontSize="9" fill={dim.stroke} textAnchor="middle" dominantBaseline="middle" fontWeight="bold">{dim.name.split('/')[0]}</text>;
                  })}
                </svg>
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                {DIMENSIONS.map((dim) => (
                  <div key={dim.key} className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800/50 group hover:border-zinc-700 transition-all">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-zinc-500">[{dim.key}] {dim.name}</span>
                      <span className={`font-bold ${activePalace.finalVec[dim.key as keyof Vector5D] > 1.0 ? dim.text : 'text-white'}`}>
                        {activePalace.finalVec[dim.key as keyof Vector5D].toFixed(1)}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-600 group-hover:text-zinc-500 transition-colors">{dim.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
