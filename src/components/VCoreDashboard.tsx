// src/components/VCoreDashboard.tsx
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip
} from 'recharts';
import { 
  Cpu, BookOpen, AlertTriangle, X, TrendingUp, BarChart3, ChevronRight, ChevronLeft
} from 'lucide-react';
import { astro } from 'iztro';
import { VCoreEngine, VectorMath, PalaceContext, Vector5D, DecadeData, YearlyTrend } from '../utils/vCoreEngine';
import { VCoreInterpreter } from '../utils/vCoreInterpreter';
import { SEMANTIC_MAPPINGS } from '../utils/vCoreData';
import { calculatePalaceEfficiencyIndex, calculateDecadeGlobalScore, getScoreColorTier } from '../utils/vCoreVisualizer';
import { VCoreTrendChart } from './VCoreTrendChart';
import { VCoreBottomSheet, BottomSheetData } from './VCoreBottomSheet';
import { SIHUA_MAP, getDynamicStarsLocations } from '../utils/dynamicScoreCalculator';
import { STEM_MUTAGENS } from '../utils/scoreCalculator';

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

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
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [detailPalaceIdx, setDetailPalaceIdx] = useState<number>(0);
  const [sheetData, setSheetData] = useState<BottomSheetData | null>(null);

  const handleDoubleClick = (idx: number) => {
    setDetailPalaceIdx(idx);
    setShowDetailModal(true);
  };

  // 1. 底层引擎测算全量数据
  const vCoreData = useMemo(() => {
    if (!iztroData) return null;
    try {
      let clean = iztroData.trim();
      if (!clean.startsWith('{')) clean = clean.match(/\{[\s\S]*\}/)?.[0] || '{}';
      const chartObj = JSON.parse(clean);
      if (!chartObj?.rawParams) return null;

      const astrolabe = astro.bySolar(chartObj.rawParams.birthday, chartObj.rawParams.birthTime, chartObj.rawParams.gender, true, 'zh-CN');
      
      // 基础宫位数据提取
      const basePalaces = astrolabe.palaces.map((p: any) => {
        const mutagens: string[] = [];
        const allStars = [...(p.majorStars || []), ...(p.minorStars || []), ...(p.adjectiveStars || [])];
        allStars.forEach((s: any) => {
          if (s.mutagen) mutagens.push(s.mutagen);
        });

        return {
          name: p.name.replace('宫', '').replace('仆役', '交友'),
          branch: p.earthlyBranch,
          ctx: {
            branch: p.earthlyBranch,
            mainStars: p.majorStars?.map((s: any) => s.name) || [],
            minorStars: [...(p.minorStars || []), ...(p.adjectiveStars || [])].map((s: any) => s.name),
            mutagens: mutagens,
            selfMutagen: null
          } as PalaceContext
        };
      });

      // 计算单宫向量的方法 (复用逻辑)
      const calculatePalaceVector = (palaces: any[], idx: number, dynamicMutagens?: string[]) => {
        const oppIdx = (idx + 6) % 12;
        const tri1Idx = (idx + 4) % 12;
        const tri2Idx = (idx + 8) % 12;
        const prevIdx = (idx + 11) % 12;
        const nextIdx = (idx + 1) % 12;

        const ctx = { ...palaces[idx].ctx };
        if (dynamicMutagens) {
          ctx.mutagens = [...ctx.mutagens, ...dynamicMutagens];
        }

        const { vector: baseVec, isEmpty } = VCoreEngine.extractBaseVector(ctx, palaces[oppIdx].ctx);
        const afflictedVec = VCoreEngine.applyAfflictions(baseVec, ctx);
        const transformedVec = VCoreEngine.applyTransforms(afflictedVec, ctx, isEmpty);
        
        const oppBase = VCoreEngine.extractBaseVector(palaces[oppIdx].ctx, ctx).vector;
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
          ctx, palaces[oppIdx].ctx, palaces[tri1Idx].ctx, palaces[tri2Idx].ctx, palaces[prevIdx].ctx, palaces[nextIdx].ctx, fusedVec
        );
        return { finalVec, tags, baseVec, ctx };
      };

      // 1. 计算本命 12 宫全量数据
      const originalPalaces = basePalaces.map((p, idx) => {
        const { finalVec, tags, baseVec } = calculatePalaceVector(basePalaces, idx);
        const palaceName = p.name.replace('仆役', '交友');
        const interpretation = VCoreInterpreter.getBaseInterpretation(p.ctx.mainStars, palaceName, finalVec);
        const mutagenInterpretations = VCoreInterpreter.getMutagenInterpretation(p.ctx.mutagens, palaceName);
        const auspiciousInterpretations = VCoreInterpreter.getAuspiciousInterpretation(p.ctx.minorStars, palaceName);
        const maleficInterpretations = VCoreInterpreter.getMaleficInterpretation(p.ctx.minorStars, palaceName);

        return { 
          ...p, 
          stars: p.ctx.mainStars.join('') || '空宫', 
          baseVec, 
          finalVec, 
          tags, 
          interpretation, 
          mutagenInterpretations, 
          auspiciousInterpretations, 
          maleficInterpretations, 
          name: palaceName.replace('宫', ''),
          pei: calculatePalaceEfficiencyIndex(palaceName, finalVec)
        };
      });

      // 2. 计算 12 大限趋势数据
      const decades = astrolabe.palaces.map(p => ({ ...p.decadal, palaceStem: p.heavenlyStem })).sort((a, b) => a.range[0] - b.range[0]);
      const decadeTrends = decades.map((d: any) => {
        // 找到大限命宫在原局的索引
        const startIdx = basePalaces.findIndex(p => p.branch === d.earthlyBranch);
        
        // 大限四化
        const dStem = d.palaceStem;
        const dSihua = SIHUA_MAP[dStem] || [];

        // 计算该大限下 12 宫的 PEI
        const decadePalacesPEI = basePalaces.map((_, pIdx) => {
          // 大限宫位名映射
          const names = ["命宫", "父母宫", "福德宫", "田宅宫", "官禄宫", "交友宫", "迁移宫", "疾厄宫", "财帛宫", "子女宫", "夫妻宫", "兄弟宫"];
          const relativeIdx = (pIdx - startIdx + 12) % 12;
          const dPalaceName = names[relativeIdx];
          
          // 提取该宫位在大限下的四化
          const dMutagens: string[] = [];
          const targetPalace = basePalaces[pIdx];
          targetPalace.ctx.mainStars.forEach(s => {
            const mIdx = dSihua.indexOf(s);
            if (mIdx !== -1) dMutagens.push(['禄', '权', '科', '忌'][mIdx]);
          });

          const natalResult = calculatePalaceVector(basePalaces, pIdx);
          const dResult = calculatePalaceVector(basePalaces, pIdx, dMutagens);
          
          // 使用 deduceTimeAxis 计算动态差值
          const { tDelta } = VCoreEngine.deduceTimeAxis(natalResult.finalVec, natalResult.ctx, dResult.finalVec, dResult.ctx);

          return {
            name: dPalaceName,
            score: calculatePalaceEfficiencyIndex(dPalaceName, dResult.finalVec),
            vector: dResult.finalVec, // 使用绝对向量，解决“一致性”问题
            tDelta: tDelta, // 保留差值供参考
            finalVec: dResult.finalVec 
          };
        }).sort((a, b) => b.score - a.score);

        // 大限命、财、官、福
        const dMingVec = decadePalacesPEI.find(p => p.name === '命宫')?.finalVec || { F: 1, P: 1, E: 1, S: 1, W: 1 };
        const dCaiVec = decadePalacesPEI.find(p => p.name === '财帛宫')?.finalVec || { F: 1, P: 1, E: 1, S: 1, W: 1 };
        const dGuanVec = decadePalacesPEI.find(p => p.name === '官禄宫')?.finalVec || { F: 1, P: 1, E: 1, S: 1, W: 1 };
        const dFuVec = decadePalacesPEI.find(p => p.name === '福德宫')?.finalVec || { F: 1, P: 1, E: 1, S: 1, W: 1 };

        const dgs = calculateDecadeGlobalScore(dMingVec, dCaiVec, dGuanVec, dFuVec);

        // 4. 计算该大限下的 10 个流年趋势 (YGS)
        const birthYear = astrolabe.rawDates.lunarDate.lunarYear;
        const bStemIdx = (birthYear - 4) % 10;
        const bBranchIdx = (birthYear - 4) % 12;

        const yearlyTrends = Array.from({ length: 10 }).map((_, yIdx) => {
          const age = d.range[0] + yIdx;
          const year = birthYear + age - 1;
          const yStem = STEMS[(bStemIdx + age - 1) % 10];
          const yBranch = BRANCHES[(bBranchIdx + age - 1) % 12];
          const ySihua = SIHUA_MAP[yStem] || [];
          
          // 流年命宫位置
          const yLifeIdx = basePalaces.findIndex(p => p.branch === yBranch);

          // 为流年生成真实的宫位数据
          const yearlyPalaces = basePalaces.map((_, pIdx) => {
             const names = ["命宫", "父母宫", "福德宫", "田宅宫", "官禄宫", "交友宫", "迁移宫", "疾厄宫", "财帛宫", "子女宫", "夫妻宫", "兄弟宫"];
             const relativeIdx = (pIdx - yLifeIdx + 12) % 12;
             const yPalaceName = names[relativeIdx];

             // 叠加：大限四化 + 流年四化
             const dyMutagens: string[] = [];
             const targetPalace = basePalaces[pIdx];
             
             // 大限四化
             targetPalace.ctx.mainStars.forEach(s => {
               const mIdx = dSihua.indexOf(s);
               if (mIdx !== -1) dyMutagens.push(['禄', '权', '科', '忌'][mIdx]);
             });
             
             // 流年四化
             targetPalace.ctx.mainStars.forEach(s => {
               const mIdx = ySihua.indexOf(s);
               if (mIdx !== -1) dyMutagens.push(['禄', '权', '科', '忌'][mIdx]);
             });

             const natalResult = calculatePalaceVector(basePalaces, pIdx);
             const yResult = calculatePalaceVector(basePalaces, pIdx, dyMutagens);
             
             const { tDelta } = VCoreEngine.deduceTimeAxis(natalResult.finalVec, natalResult.ctx, yResult.finalVec, yResult.ctx);

             return {
               name: yPalaceName,
               score: calculatePalaceEfficiencyIndex(yPalaceName, yResult.finalVec),
               vector: yResult.finalVec, // 使用绝对向量，解决“一致性”问题
               tDelta: tDelta,
               finalVec: yResult.finalVec
             };
          }).sort((a, b) => b.score - a.score);

          // 计算流年综合分 YGS
          const yMingVec = yearlyPalaces.find(p => p.name === '命宫')?.finalVec || { F: 1, P: 1, E: 1, S: 1, W: 1 };
          const yCaiVec = yearlyPalaces.find(p => p.name === '财帛宫')?.finalVec || { F: 1, P: 1, E: 1, S: 1, W: 1 };
          const yGuanVec = yearlyPalaces.find(p => p.name === '官禄宫')?.finalVec || { F: 1, P: 1, E: 1, S: 1, W: 1 };
          const yFuVec = yearlyPalaces.find(p => p.name === '福德宫')?.finalVec || { F: 1, P: 1, E: 1, S: 1, W: 1 };
          const ygs = calculateDecadeGlobalScore(yMingVec, yCaiVec, yGuanVec, yFuVec);

          return {
            age,
            year,
            ygs,
            label: `${age}岁`,
            palaces: yearlyPalaces
          };
        });

        return {
          range: `${d.range[0]}-${d.range[1]}`,
          dgs,
          palaces: decadePalacesPEI,
          yearlyTrends,
          branch: d.earthlyBranch,
          stem: d.palaceStem
        };
      });

      return {
        originalPalaces,
        decadeTrends,
        astrolabe
      };
    } catch(e) { 
      console.error("VCore Engine Error:", e);
      return null; 
    }
  }, [iztroData]);

  if (!vCoreData) return null;
  const activePalace = vCoreData.originalPalaces[selectedPalaceIdx];
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
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 overflow-y-auto custom-scrollbar p-4 md:p-6 bg-zinc-950 min-h-full">
      
      {/* --- 顶部 Header --- */}
      <div className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
            <Cpu className="text-amber-400" size={20} />
          </div>
          <div>
            <h3 className="text-zinc-100 font-bold text-sm tracking-tight">V-CORE 多维物理与语义引擎</h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">紫微命理深度诊断书</p>
          </div>
        </div>
      </div>

      {/* --- 超级大盘：大运、流年、宫位三合一引擎 --- */}
      <VCoreTrendChart 
        data={vCoreData.decadeTrends} 
        onPalaceClick={(palace, decadeRange) => {
          // 呼出您原本写好的 BottomSheet 即可！
          setSheetData({
            title: `${decadeRange}岁大限 · ${palace.name}`,
            score: palace.score,
            vector: palace.finalVec
          });
        }} 
      />

      <VCoreBottomSheet 
        isOpen={!!sheetData} 
        data={sheetData} 
        onClose={() => setSheetData(null)} 
      />

      {/* --- 图表数据区 --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左侧：雷达图 */}
        <div className="lg:col-span-7 bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 flex flex-col relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-xl font-black text-zinc-100 flex items-center gap-2">
                {activePalace.name}宫 <span className="text-zinc-600 font-mono text-sm">[{activePalace.branch}]</span>
              </h4>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-amber-500 text-xs font-bold">{activePalace.stars || '空宫'}</p>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-800/50 border border-zinc-700/50">
                  <span className="text-[9px] text-zinc-500 uppercase">PEI 效能分</span>
                  <span className={`text-[10px] font-black ${
                    activePalace.pei >= 1.2 ? 'text-emerald-400' : 
                    activePalace.pei >= 0.8 ? 'text-blue-400' : 
                    activePalace.pei >= 0.5 ? 'text-amber-400' : 'text-rose-400'
                  }`}>{activePalace.pei}</span>
                </div>
              </div>
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
          <div className="h-[280px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={DIMENSIONS.map(dim => ({ subject: dim.name.split('/')[0], A: activePalace.finalVec[dim.key as keyof Vector5D], fullMark: 1.5 }))}>
                <PolarGrid stroke="#27272a" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 11, fontWeight: 'bold' }} />
                <PolarRadiusAxis angle={30} domain={[0, 1.5]} tick={false} axisLine={false} />
                <Radar name="当前向量" dataKey="A" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2} />
                <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#f59e0b' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 右侧：切片仪 (宫位列表) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            {vCoreData.originalPalaces.map((p, idx) => (
              <button key={idx} onClick={() => setSelectedPalaceIdx(idx)} onDoubleClick={() => handleDoubleClick(idx)} className={`p-3 rounded-xl border transition-all text-left flex flex-col gap-2 ${selectedPalaceIdx === idx ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold ${selectedPalaceIdx === idx ? 'text-amber-400' : 'text-zinc-300'}`}>{p.name}</span>
                    {p.ctx.mutagens && p.ctx.mutagens.length > 0 && (
                      <div className="flex gap-0.5">
                        {p.ctx.mutagens.map((m, i) => {
                          let colorClass = 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
                          if (m === '禄') colorClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
                          if (m === '权') colorClass = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
                          if (m === '科') colorClass = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
                          if (m === '忌') colorClass = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
                          return (
                            <span key={i} className={`px-1 py-0.5 rounded text-[8px] font-bold border leading-none ${colorClass}`}>
                              {m}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] font-mono text-zinc-600">{p.branch}</span>
                </div>
                <div className="flex gap-0.5 h-1.5 w-full bg-zinc-800/50 rounded-full overflow-hidden">
                  {DIMENSIONS.map(dim => {
                    const val = p.finalVec[dim.key as keyof Vector5D];
                    // 提取颜色类名中的颜色值，例如 'bg-emerald-500' -> '#10b981'
                    const colorMap: Record<string, string> = {
                      'bg-emerald-500': '#10b981',
                      'bg-amber-500': '#f59e0b',
                      'bg-fuchsia-500': '#d946ef',
                      'bg-blue-500': '#3b82f6',
                      'bg-rose-500': '#f43f5e',
                    };
                    const color = colorMap[dim.color] || '#a855f7';
                    return (
                      <div key={dim.key} style={{ width: `${(val / 1.5) * 100}%`, backgroundColor: color }} className="h-full opacity-80" />
                    );
                  })}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 🚀 深度文本诊断区 */}
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mt-2">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
        <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2 mb-6">
          <BookOpen size={18} className="text-amber-400" />
          多维语义诊断报告
        </h3>

        {/* 主星基调结论 */}
        <div className="mb-8 space-y-4">
          <p className="text-base md:text-lg text-zinc-200 leading-relaxed font-medium bg-zinc-900/50 p-5 rounded-xl border border-zinc-800/80">
            “{interpretation.core_conclusion}”
          </p>
          
          {/* 🚀 向量动态洞察 (Vector Insights) */}
          {interpretation.vector_insights && interpretation.vector_insights.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {interpretation.vector_insights.map((insight, i) => (
                <div key={i} className="px-3 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-300 flex items-center gap-2">
                  {insight}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 🚀 四化动态干预显示区 */}
        {mutagenInterpretations.length > 0 && (
          <div className="mb-8 space-y-3">
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

        {/* 🚀 八吉星能量插件 */}
        {auspiciousInterpretations.length > 0 && (
          <div className="mb-8 space-y-3">
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

        {/* 🚀 六煞星刺客 */}
        {maleficInterpretations.length > 0 && (
          <div className="mb-8 space-y-3">
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

        {/* 优劣势展示 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-500 rounded-sm"></span> 核心优势
            </h4>
            <ul className="space-y-3">
              {interpretation.advantage.map((txt, i) => (
                <li key={i} className="text-sm text-zinc-300 flex items-start gap-2 bg-emerald-950/20 p-3 rounded-lg border border-emerald-900/30">
                  <span className="text-emerald-500 mt-0.5">✦</span> {txt}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-rose-400 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-rose-500 rounded-sm"></span> 潜在短板
            </h4>
            <ul className="space-y-3">
              {interpretation.shortcoming.map((txt, i) => (
                <li key={i} className="text-sm text-zinc-300 flex items-start gap-2 bg-rose-950/20 p-3 rounded-lg border border-rose-900/30">
                  <span className="text-rose-500 mt-0.5">⊗</span> {txt}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 场景化行动建议 (Scene Tips) */}
        <div className="bg-amber-950/20 border-l-4 border-amber-500 p-5 rounded-r-xl relative group mb-6">
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

        {/* 辅煞星与格局 Tag */}
        {(activePalace.tags.length > 0 || activePalace.ctx.minorStars.length > 0) && (
          <div className="pt-6 border-t border-zinc-800">
            <h4 className="text-xs font-bold text-zinc-500 mb-3 flex items-center gap-1"><AlertTriangle size={14} /> 环境刺客与格局</h4>
            <div className="flex flex-wrap gap-2">
              {activePalace.tags.map((t, i) => (
                <span key={`tag-${i}`} className="px-2 py-1 bg-rose-500/10 text-rose-400 text-[10px] border border-rose-500/20 rounded font-bold">
                  ⚠️ {t}
                </span>
              ))}
              {activePalace.ctx.minorStars.map((m: string, i: number) => (
                <span key={`minor-${i}`} className="px-2 py-1 bg-zinc-800 text-zinc-400 text-[10px] rounded border border-zinc-700">
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 弹窗：宫位深度解析 */}
      {showDetailModal && vCoreData.originalPalaces[detailPalaceIdx] && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowDetailModal(false)}
        >
          <div 
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-amber-400">{vCoreData.originalPalaces[detailPalaceIdx].name}宫 深度解析</h2>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 text-xs font-mono border border-zinc-700">{vCoreData.originalPalaces[detailPalaceIdx].stars || '空宫'}</span>
                  {vCoreData.originalPalaces[detailPalaceIdx].ctx.mutagens.map((m, i) => {
                    let colorClass = 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
                    if (m === '禄') colorClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
                    if (m === '权') colorClass = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
                    if (m === '科') colorClass = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
                    if (m === '忌') colorClass = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
                    return (
                      <span key={i} className={`px-2 py-1 rounded text-xs font-bold border ${colorClass}`}>
                        化{m}
                      </span>
                    );
                  })}
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
              {/* 主星解读 */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-amber-500 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-500 rounded-sm"></span> 主星基调
                </h3>
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/50">
                  <p className="text-zinc-300 text-sm leading-relaxed">
                    {vCoreData.originalPalaces[detailPalaceIdx].interpretation.core_conclusion}
                  </p>
                </div>
              </div>

              {/* 四化解读 */}
              {vCoreData.originalPalaces[detailPalaceIdx].mutagenInterpretations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-purple-400 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-purple-500 rounded-sm"></span> 四化干预
                  </h3>
                  <div className="grid gap-3">
                    {vCoreData.originalPalaces[detailPalaceIdx].mutagenInterpretations.map((mi, i) => (
                      <div key={i} className="bg-zinc-950 p-4 rounded-xl border border-purple-900/30">
                        <div className="text-purple-400 text-xs font-bold mb-2 px-2 py-1 bg-purple-500/10 inline-block rounded border border-purple-500/20">{mi.tag}</div>
                        <p className="text-zinc-300 text-sm leading-relaxed">{mi.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 吉星解读 */}
              {vCoreData.originalPalaces[detailPalaceIdx].auspiciousInterpretations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-emerald-500 rounded-sm"></span> 吉星能量
                  </h3>
                  <div className="grid gap-3">
                    {vCoreData.originalPalaces[detailPalaceIdx].auspiciousInterpretations.map((ai, i) => (
                      <div key={i} className="bg-zinc-950 p-4 rounded-xl border border-emerald-900/30">
                        <div className="text-emerald-400 text-xs font-bold mb-2 px-2 py-1 bg-emerald-500/10 inline-block rounded border border-emerald-500/20">{ai.tag}</div>
                        <p className="text-zinc-300 text-sm leading-relaxed">{ai.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 煞星解读 */}
              {vCoreData.originalPalaces[detailPalaceIdx].maleficInterpretations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-rose-500 rounded-sm"></span> 煞星刺客
                  </h3>
                  <div className="grid gap-3">
                    {vCoreData.originalPalaces[detailPalaceIdx].maleficInterpretations.map((mi, i) => (
                      <div key={i} className="bg-zinc-950 p-4 rounded-xl border border-rose-900/30">
                        <div className="text-rose-400 text-xs font-bold mb-2 px-2 py-1 bg-rose-500/10 inline-block rounded border border-rose-500/20">{mi.tag}</div>
                        <p className="text-zinc-300 text-sm leading-relaxed">{mi.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
