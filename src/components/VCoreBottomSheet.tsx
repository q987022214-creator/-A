import React, { useEffect, useState } from 'react';
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
  
  // 清洗宫位名用于匹配解读字典 (例如 "大限财帛宫" -> "财帛宫")
  const cleanPalaceName = title.replace(/(本命|大限|流年)/g, '').trim();
  const interpretations = PALACE_INTERPRETATIONS[cleanPalaceName];

  // ================= 核心逻辑：动态抽取大师解读 =================
  const getActiveInterpretations = () => {
    if (!interpretations) return [];
    
    const active: { label: string; text: string; icon: React.ReactNode; color: string }[] = [];
    
    if (vector.F >= 1.2 && interpretations.F_High) {
      active.push({ label: '财源优势 (F)', text: interpretations.F_High, icon: <Sparkles size={16}/>, color: 'text-emerald-400' });
    }
    if (vector.P >= 1.2 && interpretations.P_High) {
      active.push({ label: '权力掌控 (P)', text: interpretations.P_High, icon: <Zap size={16}/>, color: 'text-purple-400' });
    }
    if (vector.E >= 1.2 && interpretations.E_High) {
      active.push({ label: '情感羁绊 (E)', text: interpretations.E_High, icon: <Activity size={16}/>, color: 'text-pink-400' });
    }
    if (vector.S >= 1.2 && interpretations.S_High) {
      active.push({ label: '稳健底盘 (S)', text: interpretations.S_High, icon: <ShieldAlert size={16}/>, color: 'text-blue-400' });
    }
    // 注意：W(波动) 是反向指标，原始 W >= 1.2 代表极度动荡
    if (vector.W >= 1.2 && interpretations.W_High) {
      active.push({ label: '动荡高危 (W)', text: interpretations.W_High, icon: <ShieldAlert size={16}/>, color: 'text-red-500' });
    }

    return active;
  };

  const activeTexts = getActiveInterpretations();

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
          
          {/* 顶层：五维数据回显 (可在此处挂载原有的 RadarChart 组件) */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 flex flex-col items-center justify-center min-h-[120px]">
             {/* 宗师，这里预留了接口，您可以直接把之前的 <RadarChart data={vector} /> 放进来 */}
             <div className="text-slate-500 text-sm flex items-center gap-2">
                <Activity size={16} /> 
                <span>[预留位] 五维雷达图可视化加载区</span>
             </div>
             <div className="flex gap-4 mt-2 font-mono text-xs text-slate-400">
               <span>F:{vector.F.toFixed(1)}</span>
               <span>P:{vector.P.toFixed(1)}</span>
               <span>E:{vector.E.toFixed(1)}</span>
               <span>S:{vector.S.toFixed(1)}</span>
               <span className={vector.W > 1.0 ? 'text-red-400' : ''}>W:{vector.W.toFixed(1)}</span>
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
