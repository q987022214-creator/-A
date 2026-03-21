import React, { useEffect, useState } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer 
} from 'recharts';
import { X, Sparkles, Activity, ShieldAlert, Zap } from 'lucide-react';
import { getScoreColorTier } from '../utils/vCoreVisualizer';
import { Vector5D } from '../utils/vCoreData';
import { PALACE_INTERPRETATIONS } from '../data/vCoreInterpretations';

export interface BottomSheetData {
  title: string;       // 例如 "大限财帛宫" 或 "本命官禄宫"
  score: number;       // 综合效能分
  vector: Vector5D;    // 底层五维数据
}

interface VCoreBottomSheetProps {
  isOpen: boolean;
  data: BottomSheetData | null;
  onClose: () => void;
}

export const VCoreBottomSheet: React.FC<VCoreBottomSheetProps> = ({ isOpen, data, onClose }) => {
  const [animateIn, setAnimateIn] = useState(false);

  // 动画控制
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setAnimateIn(true), 10);
    } else {
      setAnimateIn(false);
    }
  }, [isOpen]);

  if (!isOpen || !data) return null;

  const { title, score, vector } = data;
  const tier = getScoreColorTier(score);
  
  // 1. 极致防御的模糊匹配：无论是 "大限财帛" 还是 "流年财帛宫"，都能精准锚定 "财帛宫"
  // 增强：先提取最后两个字符（通常是宫位核心名），或者通过分割符提取
  const cleanTitle = title.split('·').pop()?.trim() || title;
  const rawCleanName = cleanTitle.replace(/(本命|大限|流年|宫)/g, '').trim();
  
  const dictKey = Object.keys(PALACE_INTERPRETATIONS).find(k => 
    k.includes(rawCleanName) || rawCleanName.includes(k.replace('宫', ''))
  ) || "命宫"; 
  
  const interpretations = PALACE_INTERPRETATIONS[dictKey];

  // 2. 核心逻辑：动态抽取大师解读 (自适应阈值)
  const getActiveInterpretations = () => {
    if (!interpretations) return [];
    const active: { label: string; text: string; icon: React.ReactNode; color: string }[] = [];
    
    // 寻找当前宫位最突出的特质（如果都达不到 1.2，就取最高分的一项）
    const dimensions = [
      { key: 'F', label: '财源优势 (F)', icon: <Sparkles size={16}/>, color: 'text-emerald-400', text: interpretations.F_High },
      { key: 'P', label: '权力掌控 (P)', icon: <Zap size={16}/>, color: 'text-purple-400', text: interpretations.P_High },
      { key: 'E', label: '情感羁绊 (E)', icon: <Activity size={16}/>, color: 'text-pink-400', text: interpretations.E_High },
      { key: 'S', label: '稳健底盘 (S)', icon: <ShieldAlert size={16}/>, color: 'text-blue-400', text: interpretations.S_High },
      { key: 'W', label: '动荡高危 (W)', icon: <ShieldAlert size={16}/>, color: 'text-red-500', text: interpretations.W_High },
    ];

    const maxDimensionVal = Math.max(vector.F, vector.P, vector.E, vector.S, vector.W);
    
    // 自适应阈值：如果最大值都小于 1.2，则以最大值为准，确保至少显示一个最强项
    const activeThreshold = maxDimensionVal >= 1.2 ? 1.2 : maxDimensionVal;

    dimensions.forEach(dim => {
      const val = vector[dim.key as keyof Vector5D];
      if (val >= activeThreshold && dim.text) {
        active.push({ label: dim.label, text: dim.text, icon: dim.icon, color: dim.color });
      }
    });

    return active;
  };

  const activeTexts = getActiveInterpretations();

  // 雷达图数据转换
  const radarData = [
    { subject: '财', A: vector.F, fullMark: 1.5 },
    { subject: '权', A: vector.P, fullMark: 1.5 },
    { subject: '情', A: vector.E, fullMark: 1.5 },
    { subject: '稳', A: vector.S, fullMark: 1.5 },
    { subject: '波', A: vector.W, fullMark: 1.5 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none sm:p-4">
      {/* 遮罩层 */}
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity duration-300 ${animateIn ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* 面板主体 */}
      <div 
        className={`relative w-full max-w-2xl bg-slate-900 border-t border-slate-700 sm:border sm:rounded-2xl pointer-events-auto shadow-2xl transition-transform duration-300 ease-out flex flex-col max-h-[85vh] ${animateIn ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-400">综合战力效能</span>
              <span className={`text-sm font-mono font-bold ${
                tier === 'excellent' ? 'text-emerald-400' : 
                tier === 'danger' ? 'text-red-500' : 'text-blue-400'
              }`}>{score.toFixed(2)}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* 滚动内容区 */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex flex-col gap-6">
          
          {/* 顶层：五维数据回显 (RadarChart 可视化) */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 flex flex-col items-center justify-center min-h-[220px]">
             <div className="w-full h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 1.5]} tick={false} axisLine={false} />
                    <Radar 
                      name="能量向量" 
                      dataKey="A" 
                      stroke="#f59e0b" 
                      fill="#f59e0b" 
                      fillOpacity={0.3} 
                      strokeWidth={2} 
                    />
                  </RadarChart>
                </ResponsiveContainer>
             </div>
             <div className="flex gap-4 mt-2 font-mono text-[10px] text-slate-400">
               <span className={vector.F >= 1.2 ? 'text-emerald-400' : ''}>F:{vector.F.toFixed(1)}</span>
               <span className={vector.P >= 1.2 ? 'text-purple-400' : ''}>P:{vector.P.toFixed(1)}</span>
               <span className={vector.E >= 1.2 ? 'text-pink-400' : ''}>E:{vector.E.toFixed(1)}</span>
               <span className={vector.S >= 1.2 ? 'text-blue-400' : ''}>S:{vector.S.toFixed(1)}</span>
               <span className={vector.W >= 1.2 ? 'text-red-400 font-bold' : ''}>W:{vector.W.toFixed(1)}</span>
             </div>
          </div>

          {/* 中层：格局标签 (Pattern Tags) */}
          <div className="flex flex-wrap gap-2">
            {/* 这里可对接 patternRecognizer 算出的标签，目前写死示例 */}
            <span className="px-2.5 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded text-xs font-bold tracking-wide">
              🔥 动态引动
            </span>
            {vector.W >= 1.2 && (
              <span className="px-2.5 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs font-bold tracking-wide">
                ⚠️ 波动预警
              </span>
            )}
          </div>

          {/* 底层：大师级深度解读 */}
          <div>
            <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-purple-400" />
              星流微境·大师解析
            </h3>
            
            {activeTexts.length > 0 ? (
              <div className="space-y-3">
                {activeTexts.map((item, idx) => (
                  <div key={idx} className="bg-slate-800/80 rounded-lg p-3 border border-slate-700/50">
                    <div className={`flex items-center gap-1.5 text-xs font-bold mb-1 ${item.color}`}>
                      {item.icon} {item.label}
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              /* 兜底文案：当所有指标都在 0.8 左右，没有突出矛盾时 */
              <div className="bg-slate-800/80 rounded-lg p-4 border border-slate-700/50 text-center">
                <p className="text-sm text-slate-400 leading-relaxed">
                  当前宫位五维能量处于<strong className="text-blue-400 font-normal">动态平衡期</strong>。
                  未见显著的爆发性红利，亦无致命的动荡危机。此时宜稳扎稳打，静待流年吉星引动。
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
