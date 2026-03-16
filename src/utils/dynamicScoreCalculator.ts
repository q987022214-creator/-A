// src/utils/dynamicScoreCalculator.ts
import { PatternResult } from './patternRecognizer';

export interface DynamicPalaceDelta {
  domainName: string;      // 例如："大限官禄宫"
  physicalPalace: string;  // 物理落点："戌宫"
  baseScore: number;       // 原局底分
  activationScore: number; // 潜能觉醒分
  activationLogs: string[];
  flyInScore: number;      // 飞星引动分
  flyInLogs: string[];
  totalDelta: number;      // 最终总分
}

export interface LifeTrendMatrix {
  palaceTrends: DynamicPalaceDelta[][]; 
  overallTrends: DynamicPalaceDelta[];  
  decadeLabels: string[];   
}

const DECADE_NAMES = ['命宫', '兄弟宫', '夫妻宫', '子女宫', '财帛宫', '疾厄宫', '迁移宫', '交友宫', '官禄宫', '田宅宫', '福德宫', '父母宫'];
const SELF_PALACES = ['命宫', '财帛宫', '官禄宫', '田宅宫', '疾厄宫', '福德宫'];
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const getBranchIndex = (branch: string) => BRANCHES.indexOf(branch);

const SIHUA_MAP: Record<string, string[]> = {
  '甲': ['廉贞', '破军', '武曲', '太阳'], '乙': ['天机', '天梁', '紫微', '太阴'],
  '丙': ['天同', '天机', '文昌', '廉贞'], '丁': ['太阴', '天同', '天机', '巨门'],
  '戊': ['贪狼', '太阴', '右弼', '天机'], '己': ['武曲', '贪狼', '天梁', '文曲'],
  '庚': ['太阳', '武曲', '太阴', '天同'], '辛': ['巨门', '太阳', '文曲', '文昌'],
  '壬': ['天梁', '紫微', '左辅', '武曲'], '癸': ['破军', '巨门', '太阴', '贪狼']
};

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
  return {
    yang: yangTuoMap[stem]?.[0], tuo: yangTuoMap[stem]?.[1],
    kui: kuiYueMap[stem]?.[0], yue: kuiYueMap[stem]?.[1],
    sihua: SIHUA_MAP[stem] || []
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

// 单独计算大限飞星对12个物理宫位的引动 (不涉及领域身份，只算物理加减)
function calculatePhysicalFlyIn(basePalaces: any[], decadeStem: string, decadeBranch: string) {
  const scores = Array(12).fill(0);
  const logs = Array.from({ length: 12 }).map(() => [] as string[]);

  const add = (idx: number, score: number, reason: string) => {
    if (idx === -1 || score === 0) return;
    scores[idx] += score;
    logs[idx].push(`${reason}: ${score > 0 ? '+' : ''}${score}`);
  };

  const addSFSZ = (targetIdx: number, baseScore: number, reason: string) => {
    if (targetIdx === -1) return;
    add(targetIdx, baseScore, `${reason}(本宫)`);
    add((targetIdx + 6) % 12, Number((baseScore * 0.8).toFixed(1)), `${reason}(对宫辐射)`);
    add((targetIdx + 4) % 12, Number((baseScore * 0.5).toFixed(1)), `${reason}(三方辐射)`);
    add((targetIdx + 8) % 12, Number((baseScore * 0.5).toFixed(1)), `${reason}(三方辐射)`);
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
  
  const dLu = getIdxByStar(decLocs.sihua[0]), dQuan = getIdxByStar(decLocs.sihua[1]);
  const dKe = getIdxByStar(decLocs.sihua[2]), dJi = getIdxByStar(decLocs.sihua[3]);

  if (dKui !== -1) addSFSZ(dKui, 3 + getBrightnessScore(basePalaces[dKui].earthlyBranch), "大限天魁");
  if (dYue !== -1) addSFSZ(dYue, 3 + getBrightnessScore(basePalaces[dYue].earthlyBranch), "大限天钺");
  if (dKui === oKui) add(dKui, 4, "原魁+限魁(同宫叠加)");
  if (dYue === oYue) add(dYue, 4, "原钺+限钺(同宫叠加)");
  if (dKui === oYue) add(dKui, 6, "原钺+限魁(完美交会)");

  if (dYang !== -1) addSFSZ(dYang, -3 + getBrightnessScore(basePalaces[dYang].earthlyBranch), "大限擎羊");
  if (dTuo !== -1) addSFSZ(dTuo, -3 + getBrightnessScore(basePalaces[dTuo].earthlyBranch), "大限陀罗");
  if (dYang === oYang) add(dYang, -4, "原羊+限羊(叠煞)");
  if (dTuo === oTuo) add(dTuo, -4, "原陀+限陀(叠煞)");
  if (dYang === oTuo) add(dYang, -6, "原陀+限羊(极凶重叠)");

  if (dLu !== -1) addSFSZ(dLu, 10, "大限化禄");
  if (dQuan !== -1) addSFSZ(dQuan, 7, "大限化权");
  if (dKe !== -1) addSFSZ(dKe, 5, "大限化科");
  if (dJi !== -1) {
    const isSelf = SELF_PALACES.includes(basePalaces[dJi].name.replace('宫', '') + '宫');
    addSFSZ(dJi, isSelf ? -3 : -5, `大限化忌(${isSelf ? '我宫' : '他宫'})`);
  }

  if (dLu !== -1) {
    if (dLu === oLu || dLu === oLuCun) add(dLu, 10, "原禄+限禄(同宫叠加)");
    else if (getSpatialRelation(dLu, oLu) === 1) add(dLu, 8, "原禄+限禄(本对相遇)");
  }
  if (dJi !== -1) {
    if (dJi === oJi) add(dJi, -10, "原忌+限忌(同宫核爆)");
    else if (getSpatialRelation(dJi, oJi) === 1) add(dJi, -8, "原忌+限忌(本对冲破)");
  }
  if (dJi !== -1 && (dJi === oLu || dJi === oLuCun)) add(dJi, -8, "原禄+限忌(禄逢冲破)");
  if (dLu !== -1 && dLu === oJi) add(dLu, -4, "原忌+限禄(绝处逢生)");
  if (dLu !== -1 && dLu === dJi) add(dLu, -8, "限禄+限忌(大限自战)");

  return { scores, logs };
}

// 🚀 终极组装矩阵：基于大限身份去抓取物理底座与引动！
export function generateLifeTrendMatrix(basePalaces: any[], decades: any[], basePatterns: PatternResult[], baseScores: any[]): LifeTrendMatrix {
  const palaceTrends: DynamicPalaceDelta[][] = Array.from({ length: 12 }).map(() => Array(10).fill(null as any));
  const overallTrends: DynamicPalaceDelta[] = Array(10).fill(null as any);
  const decadeLabels: string[] = [];

  const validDecades = decades.slice(0, 10);

  validDecades.forEach((dec, decadeIndex) => {
    decadeLabels.push(`${dec.range[0]}-${dec.range[1]}岁\n${dec.heavenlyStem}${dec.earthlyBranch}限`);
    const decLifeIdx = getBranchIndex(dec.earthlyBranch);
    
    // 先计算大限满盘的物理引动分
    const flyIns = calculatePhysicalFlyIn(basePalaces, dec.heavenlyStem, dec.earthlyBranch);

    // 遍历12个大限身份领域 (0=大限命宫, 1=大限兄弟...)
    for (let domainIdx = 0; domainIdx < 12; domainIdx++) {
      // 🚀 核心纠偏：顺时针的地支，逆时针的宫位排布，算出该大限身份落在哪个物理地支！
      const targetPhysIdx = (decLifeIdx - domainIdx + 12) % 12;
      const physName = basePalaces[targetPhysIdx].name.replace('宫', '') + '宫';

      // 提取原局老本 (底层传进来的算分器结果)
      const bScore = baseScores[targetPhysIdx]?.totalScore || 0;

      // 判断格局觉醒
      let aScore = 0;
      let aLogs: string[] = [];
      if ([0, 4, 6, 8].includes(domainIdx)) { // 命、财、迁、官为强宫易触发觉醒
        const patternsHere = basePatterns.filter(p => p.palaceIndex === targetPhysIdx);
        patternsHere.forEach(p => {
          if (!p.isAdvantage) {
            aScore += p.finalScore;
            aLogs.push(`✨ 【${p.patternName}】主场觉醒 (大限${DECADE_NAMES[domainIdx]}行至此地): ${p.finalScore > 0 ? '+' : ''}${p.finalScore}`);
          }
        });
      }

      // 提取飞星引动
      const fScore = flyIns.scores[targetPhysIdx];
      const fLogs = flyIns.logs[targetPhysIdx];

      const tDelta = Number((bScore + aScore + fScore).toFixed(1));

      palaceTrends[domainIdx][decadeIndex] = {
        domainName: `大限${DECADE_NAMES[domainIdx]}`,
        physicalPalace: physName,
        baseScore: Number(bScore.toFixed(1)),
        activationScore: Number(aScore.toFixed(1)),
        activationLogs: aLogs,
        flyInScore: Number(fScore.toFixed(1)),
        flyInLogs: fLogs,
        totalDelta: tDelta
      };
    }

    // 🌟 综合大盘组装 (大限命1.5 + 财 + 官)
    const lifeP = palaceTrends[0][decadeIndex];
    const wealthP = palaceTrends[4][decadeIndex];
    const careerP = palaceTrends[8][decadeIndex];

    overallTrends[decadeIndex] = {
      domainName: "综合大盘 (命财官)",
      physicalPalace: `${lifeP.physicalPalace}/${wealthP.physicalPalace}/${careerP.physicalPalace}`,
      baseScore: Number((lifeP.baseScore * 1.5 + wealthP.baseScore + careerP.baseScore).toFixed(1)),
      activationScore: Number((lifeP.activationScore * 1.5 + wealthP.activationScore + careerP.activationScore).toFixed(1)),
      activationLogs: [...lifeP.activationLogs.map(l => `[命] ${l}`), ...wealthP.activationLogs.map(l => `[财] ${l}`), ...careerP.activationLogs.map(l => `[官] ${l}`)],
      flyInScore: Number((lifeP.flyInScore * 1.5 + wealthP.flyInScore + careerP.flyInScore).toFixed(1)),
      flyInLogs: [...lifeP.flyInLogs.map(l => `[命] ${l}`), ...wealthP.flyInLogs.map(l => `[财] ${l}`), ...careerP.flyInLogs.map(l => `[官] ${l}`)],
      totalDelta: Number((lifeP.totalDelta * 1.5 + wealthP.totalDelta + careerP.totalDelta).toFixed(1))
    };
  });

  return { palaceTrends, overallTrends, decadeLabels };
}
