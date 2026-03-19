import React, { useState, useMemo } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip
} from 'recharts';
import { VCoreEngine, VectorMath, PalaceContext, Vector5D } from '../utils/vCoreEngine';
import { 
  Zap, Shield, Heart, Anchor, RefreshCw, 
  ChevronRight, Info, Cpu, BarChart3, Layers
} from 'lucide-react';

interface Props {
  iztroData: string | null;
}

const DIMENSIONS = [
  { key: 'F', name: '财 (Finance)', color: '#10b981', icon: <Zap size={14} className="text-emerald-400" /> },
  { key: 'P', name: '权 (Power)', color: '#f59e0b', icon: <Shield size={14} className="text-amber-400" /> },
  { key: 'E', name: '情 (Emotion)', color: '#ef4444', icon: <Heart size={14} className="text-rose-400" /> },
  { key: 'S', name: '稳 (Stability)', color: '#3b82f6', icon: <Anchor size={14} className="text-blue-400" /> },
  { key: 'W', name: '变 (Volatility)', color: '#a855f7', icon: <RefreshCw size={14} className="text-purple-400" /> },
];

export default function VCoreDashboard({ iztroData }: Props) {
  const [showHardcore, setShowHardcore] = useState(false);
  const [selectedPalaceIdx, setSelectedPalaceIdx] = useState<number>(0);

  const processedData = useMemo(() => {
    if (!iztroData) return null;
    try {
      let clean = iztroData;
      if (!clean.startsWith('{')) clean = clean.match(/\{[\s\S]*\}/)?.[0] || '{}';
      const data = JSON.parse(clean);
      if (!data.palaces) return null;

      const palaces: PalaceContext[] = data.palaces.map((p: any) => ({
        branch: p.earthlyBranch,
        mainStars: p.majorStars.map((s: any) => s.name),
        minorStars: [...p.minorStars, ...p.badStars, ...p.adjectiveStars].map((s: any) => s.name),
        mutagens: p.majorStars.filter((s: any) => s.mutagen).map((s: any) => s.mutagen),
        selfMutagen: p.isSelfMutagen ? p.majorStars.find((s: any) => s.mutagen)?.mutagen || null : null
      }));

      // 计算所有宫位的向量
      const results = palaces.map((p, idx) => {
        const oppIdx = (idx + 6) % 12;
        const tri1Idx = (idx + 4) % 12;
        const tri2Idx = (idx + 8) % 12;
        const prevIdx = (idx + 11) % 12;
        const nextIdx = (idx + 1) % 12;

        const baseVector = VCoreEngine.calculatePalaceVector(p, palaces[oppIdx]);
        
        // 模拟空间融合 (简化版，实际引擎更复杂)
        const oppVector = VCoreEngine.calculatePalaceVector(palaces[oppIdx], p);
        const tri1Vector = VCoreEngine.calculatePalaceVector(palaces[tri1Idx]);
        const tri2Vector = VCoreEngine.calculatePalaceVector(palaces[tri2Idx]);

        const fused: Vector5D = {
          F: baseVector.F * 0.5 + oppVector.F * 0.25 + tri1Vector.F * 0.125 + tri2Vector.F * 0.125,
          P: baseVector.P * 0.5 + oppVector.P * 0.25 + tri1Vector.P * 0.125 + tri2Vector.P * 0.125,
          E: baseVector.E * 0.5 + oppVector.E * 0.25 + tri1Vector.E * 0.125 + tri2Vector.E * 0.125,
          S: baseVector.S * 0.5 + oppVector.S * 0.25 + tri1Vector.S * 0.125 + tri2Vector.S * 0.125,
          W: baseVector.W * 0.5 + oppVector.W * 0.25 + tri1Vector.W * 0.125 + tri2Vector.W * 0.125,
        };

        const { vector: finalVector, tags } = VCoreEngine.evaluateSpatialPattern(
          p, palaces[oppIdx], palaces[tri1Idx], palaces[tri2Idx],
          palaces[prevIdx], palaces[nextIdx], fused
        );

        return {
          name: data.palaces[idx].name,
          branch: p.branch,
          vector: finalVector,
          tags
        };
      });

      return results;
    } catch (e) {
      console.error("VCore processing error:", e);
      return null;
    }
  }, [iztroData]);

  if (!processedData) return null;

  const activePalace = processedData[selectedPalaceIdx];
  
  const radarData = DIMENSIONS.map(dim => ({
    subject: dim.name,
    A: activePalace.vector[dim.key as keyof Vector5D],
    fullMark: 1.5
  }));

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* 👑 顶部状态栏 */}
      <div className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 p-3 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Cpu className="text-emerald-400" size={20} />
          </div>
          <div>
            <h3 className="text-zinc-100 font-bold text-sm tracking-tight">V-CORE 向量引擎仪表盘</h3>
            <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest">Quantum Astrolabe Analysis v2.4</p>
          </div>
        </div>
        <button 
          onClick={() => setShowHardcore(!showHardcore)}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-2 ${showHardcore ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/40' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
        >
          <Layers size={12} /> {showHardcore ? '隐藏底层算法' : '开启硬核模式'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 📊 左侧：中央控制台 (雷达图) */}
        <div className="lg:col-span-7 bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <BarChart3 size={120} />
          </div>
          
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-emerald-500 text-[10px] font-bold tracking-widest uppercase mb-1 block">Spatial Resonance</span>
              <h4 className="text-xl font-black text-zinc-100 flex items-center gap-2">
                {activePalace.name} <span className="text-zinc-600 font-mono text-sm">[{activePalace.branch}]</span>
              </h4>
            </div>
            <div className="flex gap-1">
              {activePalace.tags.map((tag, i) => (
                <span key={i} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-bold">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#27272a" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 1.5]} tick={false} axisLine={false} />
                <Radar
                  name="当前向量"
                  dataKey="A"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.3}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: '#10b981' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {showHardcore && (
            <div className="mt-4 p-4 bg-black/40 rounded-xl border border-zinc-800/50 font-mono text-[10px] space-y-2 animate-in slide-in-from-bottom-2 duration-300">
              <div className="text-emerald-500/70 flex items-center gap-2">
                <Info size={12} /> <span>MATH_KERNEL_LOG:</span>
              </div>
              <div className="text-zinc-500 grid grid-cols-2 gap-x-4 gap-y-1">
                <span>V_Base = StarSystem[Main].Vector</span>
                <span className="text-zinc-400">→ {JSON.stringify(activePalace.vector)}</span>
                <span>V_Fused = Σ(Base*0.5, Opp*0.25, Tri*0.125)</span>
                <span className="text-zinc-400">→ Spatial_Damping_Applied</span>
                <span>Clamp(V_Final, 0.1, 1.5)</span>
                <span className="text-zinc-400">→ System_Safety_Lock_Active</span>
              </div>
            </div>
          )}
        </div>

        {/* 🎚️ 右侧：宫位切片仪 */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="text-zinc-500 text-[10px] font-bold tracking-widest uppercase flex items-center gap-2 mb-1">
            <ChevronRight size={12} className="text-emerald-500" /> Palace Slice Instrument
          </div>
          <div className="grid grid-cols-2 gap-2">
            {processedData.map((p, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedPalaceIdx(idx)}
                className={`p-3 rounded-xl border transition-all text-left flex flex-col gap-2 ${selectedPalaceIdx === idx ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'}`}
              >
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-bold ${selectedPalaceIdx === idx ? 'text-emerald-400' : 'text-zinc-300'}`}>{p.name}</span>
                  <span className="text-[9px] font-mono text-zinc-600">{p.branch}</span>
                </div>
                <div className="flex gap-0.5 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                  {DIMENSIONS.map(dim => {
                    const val = p.vector[dim.key as keyof Vector5D];
                    const width = (val / 1.5) * 100;
                    return (
                      <div 
                        key={dim.key} 
                        style={{ width: `${width}%`, backgroundColor: dim.color }}
                        className="h-full opacity-80"
                      />
                    );
                  })}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 📊 底部：维度深度解析 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {DIMENSIONS.map(dim => {
          const val = activePalace.vector[dim.key as keyof Vector5D];
          const percentage = Math.round((val / 1.5) * 100);
          
          return (
            <div key={dim.key} className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {dim.icon}
                  <span className="text-zinc-100 text-xs font-bold">{dim.name.split(' ')[0]}</span>
                </div>
                <span className="text-zinc-500 font-mono text-[10px]">{val.toFixed(2)}</span>
              </div>
              <div className="relative h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full transition-all duration-1000 ease-out"
                  style={{ width: `${percentage}%`, backgroundColor: dim.color }}
                />
              </div>
              <div className="flex justify-between items-center text-[9px]">
                <span className="text-zinc-600">饱和度</span>
                <span className="text-zinc-400 font-bold">{percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
