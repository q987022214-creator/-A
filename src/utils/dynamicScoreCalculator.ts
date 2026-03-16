// src/utils/dynamicScoreCalculator.ts

export interface DynamicPalaceDelta {
  palaceIndex: number;
  palaceName: string;
  deltaScore: number;
  logs: string[];
}

export interface LifeTrendMatrix {
  palaceTrends: number[][]; 
  overallTrends: number[];  
  decadeLabels: string[];   
}

const SELF_PALACES = ['命宫', '财帛宫', '官禄宫', '田宅宫', '疾厄宫', '福德宫'];

const SIHUA_MAP: Record<string, string[]> = {
  '甲': ['廉贞', '破军', '武曲', '太阳'], '乙': ['天机', '天梁', '紫微', '太阴'],
  '丙': ['天同', '天机', '文昌', '廉贞'], '丁': ['太阴', '天同', '天机', '巨门'],
  '戊': ['贪狼', '太阴', '右弼', '天机'], '己': ['武曲', '贪狼', '天梁', '文曲'],
  '庚': ['太阳', '武曲', '太阴', '天同'], '辛': ['巨门', '太阳', '文曲', '文昌'],
  '壬': ['天梁', '紫微', '左辅', '武曲'], '癸': ['破军', '巨门', '太阴', '贪狼']
};

// 🚀 修复点 1：返回真实的十二地支字符串，杜绝数字索引错位！
const getDecadeStarsLocations = (stem: string, branch: string) => {
  const yangTuoMap: Record<string, string[]> = { 
    '甲': ['卯', '丑'], '乙': ['辰', '寅'], '丙': ['午', '辰'], '丁': ['未', '巳'], '戊': ['午', '辰'],
    '己': ['未', '巳'], '庚': ['酉', '未'], '辛': ['戌', '申'], '壬': ['子', '戌'], '癸': ['丑', '亥']
  };
  const kuiYueMap: Record<string, string[]> = { 
    '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
    '乙': ['子', '申'], '己': ['子', '申'], '丙': ['亥', '酉'], '丁': ['亥', '酉'],
    '辛': ['午', '寅'], '壬': ['卯', '巳'], '癸': ['卯', '巳']
  };
  const maMap: Record<string, string> = {
    '寅': '申', '午': '申', '戌': '申', '申': '寅', '子': '寅', '辰': '寅',
    '巳': '亥', '酉': '亥', '丑': '亥', '亥': '巳', '卯': '巳', '未': '巳'
  };

  return {
    yang: yangTuoMap[stem]?.[0], tuo: yangTuoMap[stem]?.[1],
    kui: kuiYueMap[stem]?.[0], yue: kuiYueMap[stem]?.[1],
    ma: maMap[branch], sihua: SIHUA_MAP[stem] || []
  };
};

const getSpatialRelation = (idxA: number, idxB: number) => {
  if (idxA === -1 || idxB === -1) return -1;
  if (idxA === idxB) return 0;
  if (Math.abs(idxA - idxB) === 6) return 1;
  if (Math.abs(idxA - idxB) === 4 || Math.abs(idxA - idxB) === 8) return 2;
  return -1;
};

const getBrightnessScore = (branchName: string) => {
  if (['辰', '戌', '丑', '未'].includes(branchName)) return 1;
  return -1; 
};

export function calculateDecadeDelta(basePalaces: any[], decadeStem: string, decadeBranch: string): DynamicPalaceDelta[] {
  const deltas: DynamicPalaceDelta[] = Array.from({ length: 12 }).map((_, i) => ({
    palaceIndex: i, palaceName: basePalaces[i].name.replace('宫', '') + '宫', deltaScore: 0, logs: []
  }));

  const addScore = (idx: number, score: number, reason: string) => {
    if (idx === -1 || score === 0) return;
    deltas[idx].deltaScore += score;
    deltas[idx].logs.push(`${reason}: ${score > 0 ? '+' : ''}${score}`);
  };

  // 🚀 修复点 2：三方四正涟漪引力波引擎！
  // 当一颗星落入某宫，不仅本宫加分，对宫(80%)、三合(50%)全部联动！彻底消灭 0 分死水！
  const addScoreSFSZ = (targetIdx: number, baseScore: number, reason: string) => {
    if (targetIdx === -1) return;
    addScore(targetIdx, baseScore, `${reason}(本宫)`);
    addScore((targetIdx + 6) % 12, Number((baseScore * 0.8).toFixed(1)), `${reason}(对宫辐射)`);
    addScore((targetIdx + 4) % 12, Number((baseScore * 0.5).toFixed(1)), `${reason}(三方辐射)`);
    addScore((targetIdx + 8) % 12, Number((baseScore * 0.5).toFixed(1)), `${reason}(三方辐射)`);
  };

  const decLocs = getDecadeStarsLocations(decadeStem, decadeBranch);

  const getIdxByBranch = (b: string) => basePalaces.findIndex(p => p.earthlyBranch === b);
  const getIdxByStar = (sName: string) => basePalaces.findIndex(p => {
    const all = [...(p.majorStars||[]), ...(p.minorStars||[])];
    return all.some(s => s.name === sName || (sName==='化禄' && s.mutagen==='禄') || (sName==='化忌' && s.mutagen==='忌'));
  });

  const oKui = getIdxByStar('天魁'), oYue = getIdxByStar('天钺');
  const oYang = getIdxByStar('擎羊'), oTuo = getIdxByStar('陀罗');
  const oLu = getIdxByStar('化禄'), oLuCun = getIdxByStar('禄存');
  const oJi = getIdxByStar('化忌'), oQuan = getIdxByStar('化权'), oKe = getIdxByStar('化科');

  const dKui = getIdxByBranch(decLocs.kui), dYue = getIdxByBranch(decLocs.yue);
  const dYang = getIdxByBranch(decLocs.yang), dTuo = getIdxByBranch(decLocs.tuo);
  
  const dLu = getIdxByStar(decLocs.sihua[0]);
  const dQuan = getIdxByStar(decLocs.sihua[1]);
  const dKe = getIdxByStar(decLocs.sihua[2]);
  const dJi = getIdxByStar(decLocs.sihua[3]);

  // === 1. 大限吉星引动 ===
  if (dKui !== -1) addScoreSFSZ(dKui, 3 + getBrightnessScore(basePalaces[dKui].earthlyBranch), "大限天魁");
  if (dYue !== -1) addScoreSFSZ(dYue, 3 + getBrightnessScore(basePalaces[dYue].earthlyBranch), "大限天钺");
  
  if (dKui === oKui) addScore(dKui, 4, "原魁+限魁(同宫叠加)");
  if (dYue === oYue) addScore(dYue, 4, "原钺+限钺(同宫叠加)");
  if (dKui === oYue) addScore(dKui, 6, "原钺+限魁(完美交会)");

  // === 2. 大限煞星引动 ===
  if (dYang !== -1) addScoreSFSZ(dYang, -3 + getBrightnessScore(basePalaces[dYang].earthlyBranch), "大限擎羊");
  if (dTuo !== -1) addScoreSFSZ(dTuo, -3 + getBrightnessScore(basePalaces[dTuo].earthlyBranch), "大限陀罗");

  if (dYang === oYang) addScore(dYang, -4, "原羊+限羊(叠煞)");
  if (dTuo === oTuo) addScore(dTuo, -4, "原陀+限陀(叠煞)");
  if (dYang === oTuo) addScore(dYang, -6, "原陀+限羊(极凶重叠)");

  // === 3. 大限四化引动 ===
  if (dLu !== -1) addScoreSFSZ(dLu, 10, "大限化禄");
  if (dQuan !== -1) addScoreSFSZ(dQuan, 7, "大限化权");
  if (dKe !== -1) addScoreSFSZ(dKe, 5, "大限化科");
  if (dJi !== -1) {
    const isSelf = SELF_PALACES.includes(basePalaces[dJi].name.replace('宫', '') + '宫');
    addScoreSFSZ(dJi, isSelf ? -3 : -5, `大限化忌(${isSelf ? '我宫' : '他宫'})`);
  }

  // === 4. 四化交战与共振 ===
  if (dLu !== -1) {
    if (dLu === oLu || dLu === oLuCun) addScore(dLu, 10, "原禄+限禄(同宫叠加)");
    else if (getSpatialRelation(dLu, oLu) === 1) addScore(dLu, 8, "原禄+限禄(本对相遇)");
    else if (getSpatialRelation(dLu, oLu) === 2) addScore(dLu, 5, "原禄+限禄(三方相遇)");
  }
  if (dQuan !== -1) {
    if (dQuan === oQuan) addScore(dQuan, 7, "原权+限权(同宫)");
    else if (getSpatialRelation(dQuan, oQuan) === 1) addScore(dQuan, 5, "原权+限权(本对)");
  }
  if (dKe !== -1) {
    if (dKe === oKe) addScore(dKe, 5, "原科+限科(同宫)");
  }
  if (dJi !== -1) {
    if (dJi === oJi) addScore(dJi, -10, "原忌+限忌(同宫核爆)");
    else if (getSpatialRelation(dJi, oJi) === 1) addScore(dJi, -8, "原忌+限忌(本对冲破)");
  }

  // === 5. 禄忌交战 ===
  if (dJi !== -1 && (dJi === oLu || dJi === oLuCun)) addScore(dJi, -8, "原禄+限忌(禄逢冲破)");
  if (dLu !== -1 && dLu === oJi) addScore(dLu, -4, "原忌+限禄(绝处逢生)");
  if (dLu !== -1 && dLu === dJi) addScore(dLu, -8, "限禄+限忌(大限自战)");

  return deltas;
}

export function generateLifeTrendMatrix(basePalaces: any[], decades: any[]): LifeTrendMatrix {
  const palaceTrends = Array.from({ length: 12 }).map(() => Array(10).fill(0));
  const overallTrends = Array(10).fill(0);
  const decadeLabels: string[] = [];

  const validDecades = decades.slice(0, 10);

  validDecades.forEach((dec, decadeIndex) => {
    decadeLabels.push(`${dec.range[0]}-${dec.range[1]}岁`);
    
    // 算分！
    const deltas = calculateDecadeDelta(basePalaces, dec.heavenlyStem, dec.earthlyBranch);

    deltas.forEach((d, pIdx) => {
      palaceTrends[pIdx][decadeIndex] = Number(d.deltaScore.toFixed(1));
    });

    const getIdxByBranch = (b: string) => basePalaces.findIndex(p => p.earthlyBranch === b);
    const decLifeIdx = getIdxByBranch(dec.earthlyBranch);
    if (decLifeIdx !== -1) {
      const decWealthIdx = (decLifeIdx + 4) % 12;
      const decCareerIdx = (decLifeIdx + 8) % 12;
      // 综合大盘 = 命宫(x1.5) + 财帛 + 官禄
      const currentDecadeOverall = deltas[decLifeIdx].deltaScore * 1.5 + deltas[decWealthIdx].deltaScore + deltas[decCareerIdx].deltaScore;
      overallTrends[decadeIndex] = Number(currentDecadeOverall.toFixed(1));
    }
  });

  return { palaceTrends, overallTrends, decadeLabels };
}
