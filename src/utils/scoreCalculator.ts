import { PatternResult } from './patternRecognizer'; // 引入格局类型

export interface StarBreakdown {
  starName: string;
  reason: string;
  score: number;
}

export interface FormulaDetail {
  palaceRole: string;
  palaceName: string;
  rawScore: number;
  weight: number;
  calculatedScore: number;
}

export interface PalaceScore {
  index: number;
  palaceName: string;
  earthlyBranch: string;
  heavenlyStem: string;
  baseScore: number;       
  originalBaseScore: number; 
  finalScore: number;      
  baseBreakdowns: StarBreakdown[]; 
  formulaDetails: FormulaDetail[]; 
  starsStr: string;
}

const STEM_MUTAGENS: Record<string, { star: string, mutagen: string }[]> = {
  '甲': [{star:'廉贞', mutagen:'禄'}, {star:'破军', mutagen:'权'}, {star:'武曲', mutagen:'科'}, {star:'太阳', mutagen:'忌'}],
  '乙': [{star:'天机', mutagen:'禄'}, {star:'天梁', mutagen:'权'}, {star:'紫微', mutagen:'科'}, {star:'太阴', mutagen:'忌'}],
  '丙': [{star:'天同', mutagen:'禄'}, {star:'天机', mutagen:'权'}, {star:'文昌', mutagen:'科'}, {star:'廉贞', mutagen:'忌'}],
  '丁': [{star:'太阴', mutagen:'禄'}, {star:'天同', mutagen:'权'}, {star:'天机', mutagen:'科'}, {star:'巨门', mutagen:'忌'}],
  '戊': [{star:'贪狼', mutagen:'禄'}, {star:'太阴', mutagen:'权'}, {star:'右弼', mutagen:'科'}, {star:'天机', mutagen:'忌'}],
  '己': [{star:'武曲', mutagen:'禄'}, {star:'贪狼', mutagen:'权'}, {star:'天梁', mutagen:'科'}, {star:'文曲', mutagen:'忌'}],
  '庚': [{star:'太阳', mutagen:'禄'}, {star:'武曲', mutagen:'权'}, {star:'太阴', mutagen:'科'}, {star:'天同', mutagen:'忌'}],
  '辛': [{star:'巨门', mutagen:'禄'}, {star:'太阳', mutagen:'权'}, {star:'文曲', mutagen:'科'}, {star:'文昌', mutagen:'忌'}],
  '壬': [{star:'天梁', mutagen:'禄'}, {star:'紫微', mutagen:'权'}, {star:'左辅', mutagen:'科'}, {star:'武曲', mutagen:'忌'}],
  '癸': [{star:'破军', mutagen:'禄'}, {star:'巨门', mutagen:'权'}, {star:'太阴', mutagen:'科'}, {star:'贪狼', mutagen:'忌'}]
};

const STAR_SCORES: Record<string, number> = {
  '紫微': 10, '天府': 10, '太阳': 8, '太阴': 8, '武曲': 9, '天同': 6, '廉贞': 8,
  '天机': 7, '贪狼': 7, '巨门': 6, '天相': 8, '天梁': 8, '七杀': 9, '破军': 9,
  '左辅': 5, '右弼': 5, '文昌': 4, '文曲': 4, '天魁': 5, '天钺': 5,
  '擎羊': -8, '陀罗': -8, '火星': -7, '铃星': -7, '地空': -9, '地劫': -9, '化忌': -10
};

const MUTAGEN_BONUS: Record<string, number> = {
  '禄': 12, '权': 10, '科': 8, '忌': -12
};

const TRINE_MAP: Record<number, number[]> = {
  0: [4, 8], 1: [5, 9], 2: [6, 10], 3: [7, 11],
  4: [8, 0], 5: [9, 1], 6: [10, 2], 7: [11, 3],
  8: [0, 4], 9: [1, 5], 10: [2, 6], 11: [3, 7]
};

export function calculateChartScores(iztroData: any, patterns: PatternResult[] = []): PalaceScore[] {
  if (!iztroData || !iztroData.palaces) return [];

  const palaces = iztroData.palaces;
  const palaceScores: PalaceScore[] = palaces.map((p: any, index: number) => {
    const breakdowns: StarBreakdown[] = [];
    let baseScore = 0;
    const stars: string[] = [];

    // 注入格局分 (Super Buff) - 放在最前面，确保在 UI 列表顶部
    const palaceNameNormalized = p.name.endsWith('宫') ? p.name : p.name + '宫';
    const matchedPatterns = patterns.filter(pat => pat.palaceName === palaceNameNormalized);
    
    matchedPatterns.forEach(pat => {
      breakdowns.push({
        starName: `格局: ${pat.patternName}`,
        reason: pat.summary,
        score: pat.finalScore
      });
      baseScore += pat.finalScore;
    });

    const processStar = (s: any) => {
      stars.push(s.name);
      let score = STAR_SCORES[s.name] || 0;
      if (score !== 0) {
        breakdowns.push({ starName: s.name, reason: '星曜固有能量', score });
        baseScore += score;
      }
      if (s.mutagen) {
        let mScore = MUTAGEN_BONUS[s.mutagen] || 0;
        if (mScore !== 0) {
          breakdowns.push({ starName: `${s.name}[${s.mutagen}]`, reason: `四化[${s.mutagen}]加持`, score: mScore });
          baseScore += mScore;
        }
      }
    };

    if (p.majorStars) p.majorStars.forEach(processStar);
    if (p.minorStars) p.minorStars.forEach(processStar);

    return {
      index,
      palaceName: p.name,
      earthlyBranch: p.earthlyBranch,
      heavenlyStem: p.heavenlyStem,
      originalBaseScore: baseScore, 
      baseScore: baseScore,
      finalScore: 0,
      baseBreakdowns: breakdowns,
      formulaDetails: [],
      starsStr: stars.join(' ')
    };
  });

  const finalScores = palaceScores.map((p, i) => {
    const oppositeIdx = (i + 6) % 12;
    const trineIndices = TRINE_MAP[i] || [];

    const self = p;
    const opposite = palaceScores[oppositeIdx];
    const trine1 = palaceScores[trineIndices[0]];
    const trine2 = palaceScores[trineIndices[1]];

    const formulaDetails: FormulaDetail[] = [
      { palaceRole: '本宫 (Self)', palaceName: self.palaceName, rawScore: self.baseScore, weight: 1.0, calculatedScore: self.baseScore },
      { palaceRole: '对宫 (Opposite)', palaceName: opposite.palaceName, rawScore: opposite.baseScore, weight: 0.5, calculatedScore: opposite.baseScore * 0.5 },
      { palaceRole: '三合一 (Trine A)', palaceName: trine1.palaceName, rawScore: trine1.baseScore, weight: 0.2, calculatedScore: trine1.baseScore * 0.2 },
      { palaceRole: '三合二 (Trine B)', palaceName: trine2.palaceName, rawScore: trine2.baseScore, weight: 0.2, calculatedScore: trine2.baseScore * 0.2 }
    ];

    const finalScore = formulaDetails.reduce((acc, f) => acc + f.calculatedScore, 0);

    return {
      ...p,
      finalScore,
      formulaDetails
    };
  });

  return finalScores.sort((a, b) => b.finalScore - a.finalScore);
}
