// src/utils/dynamicScoreCalculator.ts
import { PatternResult } from './patternRecognizer';

export interface DynamicPalaceDelta {
  domainName: string;
  physicalPalace: string;
  baseScore: number;
  domainScore: number;       // 新增：大运得位分
  domainLogs: string[];
  activationScore: number;
  activationLogs: string[];
  overlayScore: number;
  overlayLogs: string[];
  totalDelta: number;
}

export interface LifeTrendMatrix {
  palaceTrends: DynamicPalaceDelta[][];
  overallTrends: DynamicPalaceDelta[];
  decadeLabels: string[];
}

const DECADE_NAMES = ['命宫', '兄弟宫', '夫妻宫', '子女宫', '财帛宫', '疾厄宫', '迁移宫', '交友宫', '官禄宫', '田宅宫', '福德宫', '父母宫'];
const SELF_DOMAINS = [0, 4, 8, 9, 5, 10]; // 命(0) 财(4) 官(8) 田(9) 疾(5) 福(10)
const OTHER_DOMAINS = [2, 3, 1, 7, 11, 6]; // 夫 子 兄 友 父 迁

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
    yang: getBranchIndex(yangTuoMap[stem]?.[0] || ''), 
    tuo: getBranchIndex(yangTuoMap[stem]?.[1] || ''),
    kui: getBranchIndex(kuiYueMap[stem]?.[0] || ''), 
    yue: getBranchIndex(kuiYueMap[stem]?.[1] || ''),
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

// 提取星星亮度 (针对羊陀等)
const getBrightnessBonus = (branchIdx: number) => {
  if ([4, 10, 1, 7].includes(branchIdx)) return 1; // 辰戌丑未 庙旺+1
  if ([0, 6, 3, 9, 2, 8, 5, 11].includes(branchIdx)) return -1; // 其他算陷 -1 (极简近似处理)
  return 0;
};

const hasStar = (palace: any, starName: string) => {
  const stars = [...(palace.majorStars||[]), ...(palace.minorStars||[])];
  return stars.some((s:any) => s.name.includes(starName) || (starName==='化禄' && s.mutagen==='禄') || (starName==='化权' && s.mutagen==='权') || (starName==='化科' && s.mutagen==='科') || (starName==='化忌' && s.mutagen==='忌'));
};
const getStarObj = (palace: any, starName: string) => {
  const stars = [...(palace.majorStars||[]), ...(palace.minorStars||[])];
  return stars.find((s:any) => s.name.includes(starName));
};

// 🚀 模块一：计算大运得位分 (基于大限身份与宫位底星的碰撞)
function calculateDomainBonus(domainIdx: number, physicalPalace: any) {
  let score = 0;
  let logs: string[] = [];

  const add = (s: number, reason: string) => { if (s !== 0) { score += s; logs.push(`${reason}: ${s>0?'+':''}${s}`); } };

  // 财帛宫 (4)
  if (domainIdx === 4) {
    if (hasStar(physicalPalace, '武曲') || hasStar(physicalPalace, '天府') || hasStar(physicalPalace, '太阴')) add(1, "财宫逢武/府/阴");
    if (hasStar(physicalPalace, '禄存') || hasStar(physicalPalace, '化禄')) add(2, "财宫逢双禄");
    if (hasStar(physicalPalace, '太阳') || hasStar(physicalPalace, '破军')) add(-1, "财宫逢阳/破(消耗)");
    if (hasStar(physicalPalace, '地空') || hasStar(physicalPalace, '地劫')) add(-2, "财宫逢空劫");
  }
  // 夫(2) 兄(1) 友(7) 子(3) 父(11)
  if ([2, 1, 7, 3, 11].includes(domainIdx)) {
    if (hasStar(physicalPalace, '七杀') || hasStar(physicalPalace, '破军') || hasStar(physicalPalace, '武曲') || hasStar(physicalPalace, '巨门')) add(-1, "六亲宫逢杀破武巨");
  }
  // 田宅宫 (9)
  if (domainIdx === 9) {
    if (hasStar(physicalPalace, '天府') || hasStar(physicalPalace, '太阴') || hasStar(physicalPalace, '禄存')) add(1, "田宅逢府/阴/禄");
    if (hasStar(physicalPalace, '破军')) add(-1, "田宅逢破军(破荡)");
    if (hasStar(physicalPalace, '地空') || hasStar(physicalPalace, '地劫')) add(-2, "田宅逢空劫");
  }
  // 官禄宫 (8) 或 迁移宫 (6)
  if (domainIdx === 8 || domainIdx === 6) {
    const isMiao = (sName: string) => { const s = getStarObj(physicalPalace, sName); return s && ['庙','旺'].includes(s.brightness); };
    if (isMiao('太阳') || hasStar(physicalPalace, '紫微') || hasStar(physicalPalace, '天府') || isMiao('太阴') || isMiao('武曲') || hasStar(physicalPalace, '天相') || hasStar(physicalPalace, '化禄') || hasStar(physicalPalace, '化权') || hasStar(physicalPalace, '化科')) {
      add(1, "官/迁逢强力吉星护盘");
    }
    if (hasStar(physicalPalace, '化忌')) add(-2, "官/迁逢化忌(波折)");
  }
  // 福德宫 (10)
  if (domainIdx === 10) {
    const s = getStarObj(physicalPalace, '太阴');
    if (hasStar(physicalPalace, '天同') || (s && ['庙','旺'].includes(s.brightness))) add(2, "福德逢同/阴(庙旺)");
    if (hasStar(physicalPalace, '化忌')) add(-2, "福德逢化忌(执念)");
  }

  return { score, logs };
}

// 🚀 模块二：计算大限四化与吉煞叠加分 (严格对齐您的规则表)
function calculatePhysicalOverlay(basePalaces: any[], decadeStem: string, decadeBranch: string) {
  const scores = Array(12).fill(0);
  const logs = Array.from({ length: 12 }).map(() => [] as string[]);

  const add = (idx: number, s: number, r: string) => { if (idx !== -1 && s !== 0) { scores[idx] += s; logs[idx].push(`${r}: ${s>0?'+':''}${s}`); } };

  const decLocs = getDecadeStarsLocations(decadeStem, decadeBranch);
  const dKui = decLocs.kui, dYue = decLocs.yue, dYang = decLocs.yang, dTuo = decLocs.tuo;
  
  const getIdx = (sName: string) => basePalaces.findIndex(p => hasStar(p, sName));
  const oKui = getIdx('天魁'), oYue = getIdx('天钺'), oYang = getIdx('擎羊'), oTuo = getIdx('陀罗');
  const oLu = getIdx('化禄'), oLuCun = getIdx('禄存'), oJi = getIdx('化忌'), oQuan = getIdx('化权'), oKe = getIdx('化科');

  const dLu = getIdx(decLocs.sihua[0]), dQuan = getIdx(decLocs.sihua[1]), dKe = getIdx(decLocs.sihua[2]), dJi = getIdx(decLocs.sihua[3]);

  // 大限魁钺自身与叠加
  if (dKui !== -1) add(dKui, 3 + getBrightnessBonus(dKui), "限魁单见");
  if (dYue !== -1) add(dYue, 3 + getBrightnessBonus(dYue), "限钺单见");
  // 叠加
  if (dKui === oKui) add(dKui, 4, "原魁+限魁(同宫)");
  if (dYue === oYue) add(dYue, 4, "原钺+限钺(同宫)");
  if (dKui === oYue) add(dKui, 6, "原钺+限魁(同宫)");
  if (dYue === oKui) add(dYue, 6, "原魁+限钺(同宫)");
  
  if (getSpatialRelation(dKui, oYue) === 1) add(dKui, 3, "原钺+限魁(对宫)");
  if (getSpatialRelation(dYue, oKui) === 1) add(dYue, 3, "原魁+限钺(对宫)");
  if (getSpatialRelation(dKui, oYue) === 2) add(dKui, 2, "原钺+限魁(三方)");
  if (getSpatialRelation(dYue, oKui) === 2) add(dYue, 2, "原魁+限钺(三方)");
  if (getSpatialRelation(dKui, oKui) === 2) add(dKui, 1, "原魁+限魁(三方)");
  if (getSpatialRelation(dYue, oYue) === 2) add(dYue, 1, "原钺+限钺(三方)");

  // 大限羊陀自身与叠加
  if (dYang !== -1) add(dYang, -3 + getBrightnessBonus(dYang), "限羊单见");
  if (dTuo !== -1) add(dTuo, -3 + getBrightnessBonus(dTuo), "限陀单见");
  // 叠加煞星
  if (dYang === oYang) add(dYang, -4, "原羊+限羊(同宫)");
  if (dTuo === oTuo) add(dTuo, -4, "原陀+限陀(同宫)");
  if (dYang === oTuo) add(dYang, -6, "原陀+限羊(同宫)");
  if (dTuo === oYang) add(dTuo, -6, "原羊+限陀(同宫)");
  
  if (getSpatialRelation(dYang, oTuo) === 1) add(dYang, -3, "原陀+限羊(对宫)");
  if (getSpatialRelation(dTuo, oYang) === 1) add(dTuo, -3, "原羊+限陀(对宫)");
  if (getSpatialRelation(dYang, oTuo) === 2) add(dYang, -2, "原陀+限羊(三方)");
  if (getSpatialRelation(dTuo, oYang) === 2) add(dTuo, -2, "原羊+限陀(三方)");
  if (getSpatialRelation(dYang, oYang) === 2) add(dYang, -1, "原羊+限羊(三方)");
  if (getSpatialRelation(dTuo, oTuo) === 2) add(dTuo, -1, "原陀+限陀(三方)");

  // 大限四化 (严格分宫)
  if (dLu !== -1) {
    add(dLu, 10, "限禄入局(丰收)");
    if (dLu === oLu || dLu === oLuCun) add(dLu, 10, "原禄+限禄(同宫)");
    else if (getSpatialRelation(dLu, oLu) === 1 || getSpatialRelation(dLu, oLuCun) === 1) add(dLu, 8, "原禄限禄(对宫)");
    else if (getSpatialRelation(dLu, oLu) === 2 || getSpatialRelation(dLu, oLuCun) === 2) add(dLu, 5, "原禄限禄(三方)");
  }
  if (dQuan !== -1) {
    add(dQuan, 7, "限权入局(掌控)");
    if (dQuan === oQuan) add(dQuan, 7, "原权+限权(同宫)");
    else if (getSpatialRelation(dQuan, oQuan) === 1) add(dQuan, 5, "原权+限权(对宫)");
    else if (getSpatialRelation(dQuan, oQuan) === 2) add(dQuan, 3, "原权+限权(三方)");
  }
  if (dKe !== -1) {
    add(dKe, 5, "限科入局(名声)");
    if (dKe === oKe) add(dKe, 5, "原科+限科(同宫)");
    else if (getSpatialRelation(dKe, oKe) === 1) add(dKe, 3, "原科+限科(对宫)");
    else if (getSpatialRelation(dKe, oKe) === 2) add(dKe, 1, "原科+限科(三方)");
  }

  // 大限四化逻辑处理 (这里我们在汇总装配时判断“我宫”/“他宫”，这里先标记特殊冲破)
  if (dJi !== -1) {
    if (dJi === oJi) add(dJi, -10, "原忌+限忌(同宫)");
    else if (getSpatialRelation(dJi, oJi) === 1) add(dJi, -8, "原忌+限忌(对宫)");
    else if (getSpatialRelation(dJi, oJi) === 2) add(dJi, -5, "原忌+限忌(三方)");
  }

  // 极端冲破
  if (dJi !== -1 && (dJi === oLu || dJi === oLuCun)) add(dJi, -8, "原禄逢限忌(大破)");
  if (dLu !== -1 && dLu === oJi) add(dLu, -4, "原忌逢限禄(生机)");
  if (dLu !== -1 && dLu === dJi) add(dLu, -8, "限禄战限忌(消耗)");

  return { scores, logs };
}

export function generateLifeTrendMatrix(basePalaces: any[], decades: any[], basePatterns: PatternResult[], baseScoresData: any[]): LifeTrendMatrix {
  const palaceTrends: DynamicPalaceDelta[][] = Array.from({ length: 12 }).map(() => Array(10).fill(null as any));
  const overallTrends: DynamicPalaceDelta[] = Array(10).fill(null as any);
  const decadeLabels: string[] = [];

  const validDecades = decades.slice(0, 10);

  validDecades.forEach((dec, decadeIndex) => {
    decadeLabels.push(`${dec.range[0]}-${dec.range[1]}岁\n${dec.heavenlyStem}${dec.earthlyBranch}限`);
    const decLifeIdx = getBranchIndex(dec.earthlyBranch);
    
    const overlays = calculatePhysicalOverlay(basePalaces, dec.heavenlyStem, dec.earthlyBranch);

    let totalBase = 0, totalDomain = 0, totalAct = 0, totalOverlay = 0;

    for (let domainIdx = 0; domainIdx < 12; domainIdx++) {
      const targetPhysIdx = (decLifeIdx - domainIdx + 12) % 12;
      const physName = basePalaces[targetPhysIdx].name.replace('宫', '') + '宫';

      // 1. 提取原局**纯净的星曜基础分** (不含格局分)
      const bScore = Number(baseScoresData[targetPhysIdx]?.baseScore ?? 0);

      // 2. 计算大运得位分
      const domainResult = calculateDomainBonus(domainIdx, basePalaces[targetPhysIdx]);

      // 3. 计算大运格局分 (觉醒)
      let aScore = 0;
      let aLogs: string[] = [];
      if ([0, 4, 6, 8].includes(domainIdx)) { 
        const patternsHere = basePatterns.filter(p => p.palaceIndex === targetPhysIdx);
        patternsHere.forEach(p => {
          if (!p.isAdvantage) {
            aScore += p.finalScore; // 把被隐藏的分数加回来
            aLogs.push(`✨ 【${p.patternName}】行至大限强宫得位: ${p.finalScore > 0 ? '+' : ''}${p.finalScore}`);
          }
        });
      }

      // 4. 处理限忌的我宫/他宫差异化扣分
      let oScore = overlays.scores[targetPhysIdx];
      let oLogs = [...overlays.logs[targetPhysIdx]];
      
      const dJiIdx = basePalaces.findIndex(p => hasStar(p, getDecadeStarsLocations(dec.heavenlyStem, dec.earthlyBranch).sihua[3]));
      if (dJiIdx === targetPhysIdx) {
        const jiPenalty = SELF_DOMAINS.includes(domainIdx) ? -3 : -5;
        oScore += jiPenalty;
        oLogs.push(`限忌落${SELF_DOMAINS.includes(domainIdx) ? '我宫' : '他宫'}: ${jiPenalty}`);
      }

      const tDelta = Number((bScore + domainResult.score + aScore + oScore).toFixed(1));

      palaceTrends[domainIdx][decadeIndex] = {
        domainName: `大限${DECADE_NAMES[domainIdx]}`,
        physicalPalace: physName,
        baseScore: Number(bScore.toFixed(1)),
        domainScore: Number(domainResult.score.toFixed(1)),
        domainLogs: domainResult.logs,
        activationScore: Number(aScore.toFixed(1)),
        activationLogs: aLogs,
        overlayScore: Number(oScore.toFixed(1)),
        overlayLogs: oLogs,
        totalDelta: tDelta
      };

      totalBase += bScore;
      totalDomain += domainResult.score;
      totalAct += aScore;
      totalOverlay += oScore;
    }

    // 综合大盘组装
    overallTrends[decadeIndex] = {
      domainName: "综合大盘 (十二宫总计)",
      physicalPalace: "全盘",
      baseScore: Number(totalBase.toFixed(1)),
      domainScore: Number(totalDomain.toFixed(1)),
      domainLogs: ["包含了该大限所有宫位的大运得位加总。"],
      activationScore: Number(totalAct.toFixed(1)),
      activationLogs: ["包含了该大限所有潜伏格局的得位觉醒加总。"],
      overlayScore: Number(totalOverlay.toFixed(1)),
      overlayLogs: ["包含了该大限四化吉煞的整体物理叠加总和。"],
      totalDelta: Number((totalBase + totalDomain + totalAct + totalOverlay).toFixed(1))
    };
  });

  return { palaceTrends, overallTrends, decadeLabels };
}
