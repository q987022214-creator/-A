// src/utils/dynamicScoreCalculator.ts

export interface DynamicPalaceDelta {
  palaceIndex: number;
  palaceName: string;
  deltaScore: number;
  logs: string[];
}

// 辅助：获取十二地支索引
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const getBranchIndex = (branch: string) => BRANCHES.indexOf(branch);

// 辅助：我宫与他宫定义
const SELF_PALACES = ['命宫', '财帛宫', '官禄宫', '田宅宫', '疾厄宫', '福德宫'];

// 辅助：天干对应四化 (禄, 权, 科, 忌)
const SIHUA_MAP: Record<string, string[]> = {
  '甲': ['廉贞', '破军', '武曲', '太阳'], '乙': ['天机', '天梁', '紫微', '太阴'],
  '丙': ['天同', '天机', '文昌', '廉贞'], '丁': ['太阴', '天同', '天机', '巨门'],
  '戊': ['贪狼', '太阴', '右弼', '天机'], '己': ['武曲', '贪狼', '天梁', '文曲'],
  '庚': ['太阳', '武曲', '太阴', '天同'], '辛': ['巨门', '太阳', '文曲', '文昌'],
  '壬': ['天梁', '紫微', '左辅', '武曲'], '癸': ['破军', '巨门', '太阴', '贪狼']
};

// 辅助：动态星曜落点推演
const getDecadeStarsLocations = (stem: string, branch: string) => {
  const yangTuoMap: Record<string, number[]> = { // [羊, 陀]
    '甲': [3, 1], '乙': [4, 2], '丙': [6, 4], '丁': [7, 5], '戊': [6, 4],
    '己': [7, 5], '庚': [9, 7], '辛': [10, 8], '壬': [0, 10], '癸': [1, 11]
  };
  const kuiYueMap: Record<string, number[]> = { // [魁, 钺]
    '甲': [1, 7], '戊': [1, 7], '庚': [1, 7], '乙': [0, 8], '己': [0, 8], 
    '丙': [11, 9], '丁': [11, 9], '辛': [6, 2], '壬': [3, 5], '癸': [3, 5]
  };
  const maMap: Record<string, number> = {
    '申': 2, '子': 2, '辰': 2, '寅': 8, '午': 8, '戌': 8,
    '亥': 5, '卯': 5, '未': 5, '巳': 11, '酉': 11, '丑': 11
  };
  const luCunMap: Record<string, number> = {
    '甲': 2, '乙': 3, '丙': 5, '戊': 5, '丁': 6, '己': 6, '庚': 8, '辛': 9, '壬': 11, '癸': 0
  };

  return {
    luCun: luCunMap[stem],
    yang: yangTuoMap[stem]?.[0],
    tuo: yangTuoMap[stem]?.[1],
    kui: kuiYueMap[stem]?.[0],
    yue: kuiYueMap[stem]?.[1],
    ma: maMap[branch],
    sihua: SIHUA_MAP[stem] || []
  };
};

// 辅助：判断是否在三方四正 (0: 同宫, 1: 对宫, 2: 三方, -1: 无关)
const getSpatialRelation = (idxA: number, idxB: number) => {
  if (idxA === idxB) return 0;
  if (Math.abs(idxA - idxB) === 6) return 1;
  if (Math.abs(idxA - idxB) === 4 || Math.abs(idxA - idxB) === 8) return 2;
  return -1;
};

// 辅助：亮度判断 (仅针对羊陀等有亮度的煞曜)
const getBrightnessScore = (starName: string, branchIdx: number) => {
  if (starName === '擎羊' || starName === '陀罗') {
    // 辰戌丑未为庙旺(+1)，子午卯酉/寅申巳亥为陷(-1)
    if ([1, 4, 7, 10].includes(branchIdx)) return 1;
    return -1; 
  }
  // 其他星曜的亮度算法可根据需要扩展，此处遵照“无亮度不参与”原则
  return 0;
};

export function calculateDecadeDelta(basePalaces: any[], decadeStem: string, decadeBranch: string): DynamicPalaceDelta[] {
  const deltas: DynamicPalaceDelta[] = Array.from({ length: 12 }).map((_, i) => ({
    palaceIndex: i,
    palaceName: basePalaces[i].name.replace('宫', '') + '宫',
    deltaScore: 0,
    logs: []
  }));

  const addScore = (idx: number, score: number, reason: string) => {
    if (score === 0) return;
    deltas[idx].deltaScore += score;
    deltas[idx].logs.push(`${reason}: ${score > 0 ? '+' : ''}${score}`);
  };

  const decLocs = getDecadeStarsLocations(decadeStem, decadeBranch);

  // 1. 寻找原局星曜位置
  const findOriginalStar = (starName: string) => {
    return basePalaces.findIndex(p => {
      const allStars = [...(p.majorStars || []), ...(p.minorStars || [])];
      return allStars.some(s => s.name === starName || (starName === '化禄' && s.mutagen === '禄') || (starName === '化忌' && s.mutagen === '忌'));
    });
  };

  const origKui = findOriginalStar('天魁');
  const origYue = findOriginalStar('天钺');
  const origYang = findOriginalStar('擎羊');
  const origTuo = findOriginalStar('陀罗');
  const origLu = findOriginalStar('化禄'); // 原局化禄
  const origLuCun = findOriginalStar('禄存');
  const origJi = findOriginalStar('化忌');

  const origLuPositions = [origLu, origLuCun].filter(idx => idx !== -1);

  // 2. 核心遍历：计算大限各宫位的动态增减分
  for (let i = 0; i < 12; i++) {
    const isSelfPalace = SELF_PALACES.includes(deltas[i].palaceName);

    // =====================================
    // 模块 A：大限吉星自身与原局叠加 (以魁钺、禄马为例)
    // =====================================
    const hasDecKui = decLocs.kui === i;
    const hasDecYue = decLocs.yue === i;
    
    // 吉星单见与亮度
    if (hasDecKui) addScore(i, 3 + getBrightnessScore('天魁', i), "大限吉星(魁)本宫单见");
    if (hasDecYue) addScore(i, 3 + getBrightnessScore('天钺', i), "大限吉星(钺)本宫单见");

    // 吉星大限与原局叠加
    if (hasDecKui || hasDecYue) {
      const decStarName = hasDecKui ? "限魁" : "限钺";
      // 同本宫
      if (origKui === i || origYue === i) {
        const origStarName = origKui === i ? "原魁" : "原钺";
        const score = (origStarName === "原魁" && decStarName === "限魁") || (origStarName === "原钺" && decStarName === "限钺") ? 4 : 6;
        addScore(i, score, `吉星同本宫(${origStarName}+${decStarName})`);
      }
      // 本对与本三方
      if (getSpatialRelation(origKui, i) === 1) addScore(i, 3, `吉星本宫-对宫(原魁+${decStarName})`);
      if (getSpatialRelation(origYue, i) === 1) addScore(i, 3, `吉星本宫-对宫(原钺+${decStarName})`);
      if (getSpatialRelation(origKui, i) === 2) {
        addScore(i, decStarName === "限魁" ? 1 : 2, `吉星本宫-三方(原魁+${decStarName})`);
      }
      if (getSpatialRelation(origYue, i) === 2) {
        addScore(i, decStarName === "限钺" ? 1 : 2, `吉星本宫-三方(原钺+${decStarName})`);
      }
    }

    // =====================================
    // 模块 B：大限煞星自身与原局叠加 (羊陀)
    // =====================================
    const hasDecYang = decLocs.yang === i;
    const hasDecTuo = decLocs.tuo === i;

    // 煞星单见与亮度
    if (hasDecYang) addScore(i, -3 + getBrightnessScore('擎羊', i), "大限煞星(羊)本宫单见");
    if (hasDecTuo) addScore(i, -3 + getBrightnessScore('陀罗', i), "大限煞星(陀)本宫单见");

    // 煞星大限与原局叠加 (叠煞)
    if (hasDecYang || hasDecTuo) {
      const decBadName = hasDecYang ? "限羊" : "限陀";
      if (origYang === i) {
        const score = decBadName === "限羊" ? -4 : -6;
        addScore(i, score, `煞星同本宫(原羊+${decBadName})`);
      }
      if (origTuo === i) {
        const score = decBadName === "限陀" ? -4 : -6;
        addScore(i, score, `煞星同本宫(原陀+${decBadName})`);
      }

      if (getSpatialRelation(origYang, i) === 1) addScore(i, -3, `煞星本宫-对宫(原羊+${decBadName})`);
      if (getSpatialRelation(origYang, i) === 2) addScore(i, decBadName === "限羊" ? -1 : -2, `煞星本宫-三方(原羊+${decBadName})`);
    }

    // =====================================
    // 模块 C：大限四化动态计分
    // =====================================
    const findSihuaStar = (starName: string) => basePalaces[i].majorStars?.some((s:any) => s.name.includes(starName));
    
    const isLu = findSihuaStar(decLocs.sihua[0]);
    const isQuan = findSihuaStar(decLocs.sihua[1]);
    const isKe = findSihuaStar(decLocs.sihua[2]);
    const isJi = findSihuaStar(decLocs.sihua[3]);

    // 1. 基础赋分
    if (isLu) addScore(i, 10, "大限化禄(丰收/顺利)");
    if (isQuan) addScore(i, 7, "大限化权(掌控/奋斗)");
    if (isKe) addScore(i, 5, "大限化科(名声/贵人)");
    if (isJi) addScore(i, isSelfPalace ? -3 : -5, `大限化忌(${isSelfPalace ? '我宫' : '他宫'})`);

    // 2. 四化叠加原局四化
    if (isLu && origLuPositions.includes(i)) addScore(i, 10, "原禄限禄同宫相遇");
    if (isLu && origLuPositions.some(pos => getSpatialRelation(pos, i) === 1)) addScore(i, 8, "原禄限禄本对相遇");
    if (isLu && origLuPositions.some(pos => getSpatialRelation(pos, i) === 2)) addScore(i, 5, "原禄限禄本三相遇");

    if (isQuan && findOriginalStar('化权') === i) addScore(i, 7, "原权限权同宫相遇");
    if (isKe && findOriginalStar('化科') === i) addScore(i, 5, "原科限科同宫相遇");

    if (isJi && origJi === i) addScore(i, -10, "原忌限忌同宫相遇");
    if (isJi && getSpatialRelation(origJi, i) === 1) addScore(i, -8, "原忌限忌本对相遇");
    if (isJi && getSpatialRelation(origJi, i) === 2) addScore(i, -5, "原忌限忌本三相遇");

    // 3. 禄忌交战特殊规则
    if (origLuPositions.includes(i) && isJi) addScore(i, -8, "原禄+限忌 同宫(禄逢冲破)");
    if (origJi === i && isLu) addScore(i, -4, "原忌+限禄 同宫(绝处逢生)");
    if (isLu && isJi) addScore(i, -8, "限禄+限忌 同宫(大限自战)");
  }

  return deltas;
}

export interface LifeTrendMatrix {
  palaceTrends: number[][]; // 12宫 x 10个大限 的增量分数矩阵
  overallTrends: number[];  // 10个大限的综合大盘走势（运限命财官总和）
  decadeLabels: string[];   // 大限的标签，例如 ["2-11岁", "12-21岁"...]
}

/**
 * 🚀 全息生命走势矩阵生成器
 * @param basePalaces 原局12宫数据
 * @param decades Iztro提取的大限数组 (长度通常为10或12)
 * @returns 包含12宫起伏与综合走势的数据矩阵
 */
export function generateLifeTrendMatrix(basePalaces: any[], decades: any[]): LifeTrendMatrix {
  // 初始化 12 宫，每宫 10 个阶段的数组
  const palaceTrends = Array.from({ length: 12 }).map(() => Array(10).fill(0));
  const overallTrends = Array(10).fill(0);
  const decadeLabels: string[] = [];

  // 只取前 10 个大限（百年人生）
  const validDecades = decades.slice(0, 10);

  validDecades.forEach((dec, decadeIndex) => {
    decadeLabels.push(`${dec.range[0]}-${dec.range[1]}岁`);
    
    // 调用上一回合我们写好的核心引擎，算出这个大限的 12 宫变化分
    const deltas = calculateDecadeDelta(basePalaces, dec.heavenlyStem, dec.earthlyBranch);

    deltas.forEach((d, pIdx) => {
      palaceTrends[pIdx][decadeIndex] = d.deltaScore;
    });

    // 综合大盘走势：大限的【命宫】+【财帛宫】+【官禄宫】增量之和
    // 寻找大限命宫落在哪个地支
    const decLifeBranch = dec.earthlyBranch;
    const decLifeIdx = getBranchIndex(decLifeBranch);
    const decWealthIdx = (decLifeIdx + 4) % 12;
    const decCareerIdx = (decLifeIdx + 8) % 12;

    const currentDecadeOverall = 
      deltas[decLifeIdx].deltaScore * 1.5 + // 命宫权重大
      deltas[decWealthIdx].deltaScore + 
      deltas[decCareerIdx].deltaScore;
    
    overallTrends[decadeIndex] = Number(currentDecadeOverall.toFixed(1));
  });

  return { palaceTrends, overallTrends, decadeLabels };
}
