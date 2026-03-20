// src/utils/vCoreVisualizer.ts
import { Vector5D } from './vCoreData';

/**
 * 🗄️ 场景量化权重矩阵 (严格遵循中州派法理)
 */
export const PALACE_WEIGHTS: Record<string, Vector5D> = {
  "命宫":   { F: 0.20, P: 0.25, E: 0.20, S: 0.20, W: 0.15 },
  "财帛宫": { F: 0.50, P: 0.20, E: 0.05, S: 0.15, W: 0.10 },
  "官禄宫": { F: 0.30, P: 0.40, E: 0.05, S: 0.15, W: 0.10 },
  "夫妻宫": { F: 0.05, P: 0.05, E: 0.40, S: 0.30, W: 0.20 },
  "交友宫": { F: 0.05, P: 0.05, E: 0.40, S: 0.30, W: 0.20 },
  "福德宫": { F: 0.10, P: 0.10, E: 0.30, S: 0.25, W: 0.25 },
  "疾厄宫": { F: 0.10, P: 0.10, E: 0.30, S: 0.25, W: 0.25 },
  "田宅宫": { F: 0.30, P: 0.10, E: 0.10, S: 0.40, W: 0.10 },
  "DEFAULT":{ F: 0.20, P: 0.20, E: 0.20, S: 0.20, W: 0.20 }
};

/**
 * 📊 算法 A：单宫综合效能分 (Palace Efficiency Index, PEI)
 * @param rawPalaceName 原始宫位名称 (支持带"大限"、"流年"前缀)
 * @param vector 该宫位底层的五维向量
 * @returns 0.1 ~ 1.5 的综合标准分 (用于前端柱状图 Y 轴)
 */
export function calculatePalaceEfficiencyIndex(rawPalaceName: string, vector: Vector5D): number {
  if (!vector) return 0.1; // 极值防御

  // 防御性字符串清洗：剥离前缀，精准匹配
  // 例如将 "大限财帛宫" 清洗为 "财帛宫"
  const cleanName = rawPalaceName.replace(/(本命|大限|流年)/g, '').trim();
  
  // 匹配权重，若无匹配则降级使用默认权重
  const weights = PALACE_WEIGHTS[cleanName] || PALACE_WEIGHTS["DEFAULT"];

  // 核心逻辑：W维度(波动)反向标准化。波动越大，安定分越低。
  const w_std = 1.6 - vector.W;

  // 加权聚合
  const score = (vector.F * weights.F) + 
                (vector.P * weights.P) + 
                (vector.E * weights.E) + 
                (vector.S * weights.S) + 
                (w_std * weights.W);

  // 绝对边界控制：防止 JS 浮点数溢出，确保返回值在 0.1 到 1.5 之间
  return Number(Math.max(0.1, Math.min(1.5, score)).toFixed(2));
}

/**
 * 📈 算法 B：大限全局综合分 (Decade Global Score)
 * @description 计算单个人生十年的整体运势起伏，专供“人生大运起伏 K线/柱状图”使用。
 */
export function calculateDecadeGlobalScore(
  mingVector: Vector5D, 
  caiVector: Vector5D, 
  guanVector: Vector5D, 
  fuVector: Vector5D
): number {
  const mingScore = calculatePalaceEfficiencyIndex("命宫", mingVector);
  const caiScore = calculatePalaceEfficiencyIndex("财帛宫", caiVector);
  const guanScore = calculatePalaceEfficiencyIndex("官禄宫", guanVector);
  const fuScore = calculatePalaceEfficiencyIndex("福德宫", fuVector);

  // 中州派四正位核心权重聚合
  const globalScore = (mingScore * 0.30) + 
                      (caiScore * 0.25) + 
                      (guanScore * 0.25) + 
                      (fuScore * 0.20);

  return Number(Math.max(0.1, Math.min(1.5, globalScore)).toFixed(2));
}

/**
 * 🎨 辅助函数：分值颜色映射器
 * @returns 供 Tailwind CSS 使用的语义化颜色分类
 */
export function getScoreColorTier(score: number): 'excellent' | 'good' | 'warning' | 'danger' {
  if (score >= 1.2) return 'excellent'; // 翠绿/金色 (极强)
  if (score >= 0.8) return 'good';      // 科技蓝 (平稳)
  if (score >= 0.5) return 'warning';   // 警示黄 (偏弱)
  return 'danger';                      // 危险红 (极弱)
}
