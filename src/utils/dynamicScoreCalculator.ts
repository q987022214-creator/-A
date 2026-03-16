// src/utils/dynamicScoreCalculator.ts
import { PatternResult } from './patternRecognizer';

export interface DynamicPalaceDelta {
  domainName: string;
  physicalPalace: string;
  baseScore: number;
  domainScore: number;       
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
const SELF_DOMAINS = [0, 4, 8, 9, 5, 10]; 

// 🚀 核心修复 1：地支绝对坐标系
const BRANCHES = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"];
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
  const changQuMap: Record<string, string[]> = {
    '甲': ['巳', '酉'], '乙': ['午', '戌'], '丙': ['申', '子'], '丁': ['酉', '亥'], '戊': ['申', '子'], 
    '己': ['酉', '亥'], '庚': ['亥', '卯'], '辛': ['子', '辰'], '壬': ['寅', '午'], '癸': ['卯', '未']
  };
  const luCunMap: Record<string, string> = {
    '甲': '寅', '乙': '卯', '丙': '巳', '戊': '巳', '丁': '午', '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子'
  };
  const maMap: Record<string, string> = {
    '寅': '申', '午': '申', '戌': '申', '申': '寅', '子': '寅', '辰': '寅', '巳': '亥', '酉': '亥', '丑': '亥', '亥': '巳', '卯': '巳', '未': '巳'
  };

  return {
    yang: getBranchIndex(yangTuoMap[stem]?.[0] || ''), tuo: getBranchIndex(yangTuoMap[stem]?.[1] || ''),
    kui: getBranchIndex(kuiYueMap[stem]?.[0] || ''), yue: getBranchIndex(kuiYueMap[stem]?.[1] || ''),
    chang: getBranchIndex(changQuMap[stem]?.[0] || ''), qu: getBranchIndex(changQuMap[stem]?.[1] || ''),
    luCun: getBranchIndex(luCunMap[stem] || ''), ma: getBranchIndex(maMap[branch] || ''),
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

const getBrightnessBonus = (branchName: string) => {
  if (['辰', '戌', '丑', '未'].includes(branchName)) return 1;
  if (['子', '午', '卯', '酉', '寅', '申', '巳', '亥'].includes(branchName)) return -1; 
  return 0;
};

const hasStar = (palace: any, starName: string) => {
  const stars = [...(palace.majorStars||[]), ...(palace.minorStars||[])];
  return stars.some((s:any) => s.name.includes(starName));
};
const getStarObj = (palace: any, starName: string) => {
  const stars = [...(palace.majorStars||[]), ...(palace.minorStars||[])];
  return stars.find((s:any) => s.name.includes(starName));
};

function calculateDomainBonus(domainIdx: number, physicalPalace: any) {
  let score = 0;
  let logs: string[] = [];
  const add = (s: number, reason: string) => { if (s !== 0) { score += s; logs.push(`${reason}: ${s>0?'+':''}${s}`); } };

  if (domainIdx === 4) {
    if (hasStar(physicalPalace, '武曲') || hasStar(physicalPalace, '天府') || hasStar(physicalPalace, '太阴')) add(1, "财宫逢武/府/阴");
    if (hasStar(physicalPalace, '禄存') || hasStar(physicalPalace, '化禄')) add(2, "财宫逢双禄");
    if (hasStar(physicalPalace, '太阳') || hasStar(physicalPalace, '破军')) add(-1, "财宫逢阳/破");
    if (hasStar(physicalPalace, '地空') || hasStar(physicalPalace, '地劫')) add(-2, "财宫逢空劫");
  }
  if ([2, 1, 7, 3, 11].includes(domainIdx)) {
    if (hasStar(physicalPalace, '七杀') || hasStar(physicalPalace, '破军') || hasStar(physicalPalace, '武曲') || hasStar(physicalPalace, '巨门')) add(-1, "六亲宫逢耗星");
  }
  if (domainIdx === 9) {
    if (hasStar(physicalPalace, '天府') || hasStar(physicalPalace, '太阴') || hasStar(physicalPalace, '禄存')) add(1, "田宅得库");
    if (hasStar(physicalPalace, '破军')) add(-1, "田宅破耗");
    if (hasStar(physicalPalace, '地空') || hasStar(physicalPalace, '地劫')) add(-2, "田宅空劫");
  }
  if (domainIdx === 8 || domainIdx === 6) {
    const isMiao = (sName: string) => { const s = getStarObj(physicalPalace, sName); return s && ['庙','旺'].includes(s.brightness); };
    if (isMiao('太阳') || hasStar(physicalPalace, '紫微') || hasStar(physicalPalace, '天府') || isMiao('太阴') || isMiao('武曲') || hasStar(physicalPalace, '天相') || hasStar(physicalPalace, '化禄') || hasStar(physicalPalace, '化权') || hasStar(physicalPalace, '化科')) {
      add(1, "官/迁逢强力护盘");
    }
  }
  if (domainIdx === 10) {
    const s = getStarObj(physicalPalace, '太阴');
    if (hasStar(physicalPalace, '天同') || (s && ['庙','旺'].includes(s.brightness))) add(2, "福德逢同/阴(庙旺)");
  }

  // 单独处理化忌得位
  const allStars = [...(physicalPalace.majorStars||[]), ...(physicalPalace.minorStars||[])];
  if (allStars.some(s => s.mutagen === '忌')) {
    if (domainIdx === 8 || domainIdx === 6) add(-2, "官/迁逢化忌");
    if (domainIdx === 10) add(-2, "福德逢化忌");
  }

  return { score, logs };
}

function calculatePhysicalOverlay(basePalaces: any[], decadeStem: string, decadeBranch: string) {
  const scores = Array(12).fill(0);
  const logs = Array.from({ length: 12 }).map(() => [] as string[]);

  const add = (idx: number, s: number, r: string) => { if (idx !== -1 && s !== 0) { scores[idx] += s; logs[idx].push(`${r}: ${s>0?'+':''}${s}`); } };

  // 🚀 核心修复 2：辐射函数加入物理地支名称，拒绝盲人摸象！
  const addSFSZ = (targetIdx: number, baseScore: number, reason: string) => {
    if (targetIdx === -1) return;
    const bName = BRANCHES[targetIdx];
    add(targetIdx, baseScore, `${reason}(于${bName}本宫)`);
    add((targetIdx + 6) % 12, Number((baseScore * 0.8).toFixed(1)), `${reason}(于${bName}对宫辐射)`);
    add((targetIdx + 4) % 12, Number((baseScore * 0.5).toFixed(1)), `${reason}(于${bName}三方辐射)`);
    add((targetIdx + 8) % 12, Number((baseScore * 0.5).toFixed(1)), `${reason}(于${bName}三方辐射)`);
  };

  const decLocs = getDecadeStarsLocations(decadeStem, decadeBranch);
  const dKui = decLocs.kui, dYue = decLocs.yue, dYang = decLocs.yang, dTuo = decLocs.tuo;
  const dChang = decLocs.chang, dQu = decLocs.qu, dLuCun = decLocs.luCun, dMa = decLocs.ma;
  
  // 🚀 核心修复 3：彻底解耦数组索引，只认物理地支！
  const getPhysIdxByStar = (sName: string) => { const p = basePalaces.find(p => hasStar(p, sName)); return p ? getBranchIndex(p.earthlyBranch) : -1; };
  const getPhysIdxByMutagen = (m: string) => { const p = basePalaces.find(p => [...(p.majorStars||[]), ...(p.minorStars||[])].some(s => s.mutagen === m)); return p ? getBranchIndex(p.earthlyBranch) : -1; };

  const oKui = getPhysIdxByStar('天魁'), oYue = getPhysIdxByStar('天钺'), oYang = getPhysIdxByStar('擎羊'), oTuo = getPhysIdxByStar('陀罗');
  const oChang = getPhysIdxByStar('文昌'), oQu = getPhysIdxByStar('文曲'), oMa = getPhysIdxByStar('天马');
  const oLuCun = getPhysIdxByStar('禄存');
  const oLu = getPhysIdxByMutagen('禄'), oQuan = getPhysIdxByMutagen('权'), oKe = getPhysIdxByMutagen('科'), oJi = getPhysIdxByMutagen('忌');

  const dLu = getPhysIdxByStar(decLocs.sihua[0]), dQuan = getPhysIdxByStar(decLocs.sihua[1]), dKe = getPhysIdxByStar(decLocs.sihua[2]), dJi = getPhysIdxByStar(decLocs.sihua[3]);

  const applyAuspiciousPair = (o1: number, o2: number, d1: number, d2: number, n1: string, n2: string) => {
    if (o1 !== -1 && d2 !== -1) {
      if (o1 === d2) add(o1, 6, `原${n1}+限${n2}(同宫)`);
      else if (getSpatialRelation(o1, d2) === 1) add(o1, 3, `原${n1}+限${n2}(本对)`);
      else if (getSpatialRelation(o1, d2) === 2) add(o1, 2, `原${n1}+限${n2}(本三方)`);
    }
    if (o2 !== -1 && d1 !== -1) {
      if (o2 === d1) add(o2, 6, `原${n2}+限${n1}(同宫)`);
      else if (getSpatialRelation(o2, d1) === 1) add(o2, 3, `原${n2}+限${n1}(本对)`);
      else if (getSpatialRelation(o2, d1) === 2) add(o2, 2, `原${n2}+限${n1}(本三方)`);
    }
    if (o1 !== -1 && d1 !== -1) {
      if (o1 === d1) add(o1, 4, `原${n1}+限${n1}(同宫)`);
      else if (getSpatialRelation(o1, d1) === 2) add(o1, 1, `原${n1}+限${n1}(本三方)`);
    }
    if (o2 !== -1 && d2 !== -1) {
      if (o2 === d2) add(o2, 4, `原${n2}+限${n2}(同宫)`);
      else if (getSpatialRelation(o2, d2) === 2) add(o2, 1, `原${n2}+限${n2}(本三方)`);
    }
  };

  if (dKui !== -1) addSFSZ(dKui, 3 + getBrightnessBonus(BRANCHES[dKui]), "限魁单见");
  if (dYue !== -1) addSFSZ(dYue, 3 + getBrightnessBonus(BRANCHES[dYue]), "限钺单见");
  if (dChang !== -1) addSFSZ(dChang, 3 + getBrightnessBonus(BRANCHES[dChang]), "限昌单见");
  if (dQu !== -1) addSFSZ(dQu, 3 + getBrightnessBonus(BRANCHES[dQu]), "限曲单见");
  if (dLuCun !== -1) addSFSZ(dLuCun, 3 + getBrightnessBonus(BRANCHES[dLuCun]), "限禄存单见");
  if (dMa !== -1) addSFSZ(dMa, 3 + getBrightnessBonus(BRANCHES[dMa]), "限马单见");

  applyAuspiciousPair(oKui, oYue, dKui, dYue, '魁', '钺');
  applyAuspiciousPair(oChang, oQu, dChang, dQu, '昌', '曲');
  applyAuspiciousPair(oLuCun, oMa, dLuCun, dMa, '禄存', '马');

  if (dYang !== -1) addSFSZ(dYang, -3 + getBrightnessBonus(BRANCHES[dYang]), "限羊单见");
  if (dTuo !== -1) addSFSZ(dTuo, -3 + getBrightnessBonus(BRANCHES[dTuo]), "限陀单见");

  if (dYang === oYang) add(dYang, -4, "原羊+限羊(同宫)");
  if (dTuo === oTuo) add(dTuo, -4, "原陀+限陀(同宫)");
  if (dYang === oTuo) add(dYang, -6, "原陀+限羊(同宫)");
  if (dTuo === oYang) add(dTuo, -6, "原羊+限陀(同宫)");
  
  if (getSpatialRelation(dYang, oTuo) === 1) add(dYang, -3, `原陀冲限羊(对宫)`);
  if (getSpatialRelation(dTuo, oYang) === 1) add(dTuo, -3, `原羊冲限陀(对宫)`);
  if (getSpatialRelation(dYang, oTuo) === 2) add(dYang, -2, `原陀+限羊(三方)`);
  if (getSpatialRelation(dTuo, oYang) === 2) add(dTuo, -2, `原羊+限陀(三方)`);
  if (getSpatialRelation(dYang, oYang) === 2) add(dYang, -1, `原羊+限羊(三方)`);
  if (getSpatialRelation(dTuo, oTuo) === 2) add(dTuo, -1, `原陀+限陀(三方)`);

  if (dLu !== -1) {
    add(dLu, 10, "限禄入局");
    if (dLu === oLu || dLu === oLuCun) add(dLu, 10, "原禄+限禄(同宫)");
    else if (getSpatialRelation(dLu, oLu) === 1 || getSpatialRelation(dLu, oLuCun) === 1) add(dLu, 8, "原禄冲限禄(对宫)");
    else if (getSpatialRelation(dLu, oLu) === 2 || getSpatialRelation(dLu, oLuCun) === 2) add(dLu, 5, "原禄会限禄(三方)");
  }
  if (dQuan !== -1) {
    add(dQuan, 7, "限权入局");
    if (dQuan === oQuan) add(dQuan, 7, "原权+限权(同宫)");
    else if (getSpatialRelation(dQuan, oQuan) === 1) add(dQuan, 5, "原权冲限权(对宫)");
    else if (getSpatialRelation(dQuan, oQuan) === 2) add(dQuan, 3, "原权会限权(三方)");
  }
  if (dKe !== -1) {
    add(dKe, 5, "限科入局");
    if (dKe === oKe) add(dKe, 5, "原科+限科(同宫)");
    else if (getSpatialRelation(dKe, oKe) === 1) add(dKe, 3, "原科冲限科(对宫)");
    else if (getSpatialRelation(dKe, oKe) === 2) add(dKe, 1, "原科会限科(三方)");
  }

  if (dJi !== -1) {
    if (dJi === oJi) add(dJi, -10, "原忌+限忌(同宫核爆)");
    else if (getSpatialRelation(dJi, oJi) === 1) add(dJi, -8, "原忌冲限忌(对宫)");
    else if (getSpatialRelation(dJi, oJi) === 2) add(dJi, -5, "原忌会限忌(三方)");
  }

  if (dJi !== -1 && (dJi === oLu || dJi === oLuCun)) add(dJi, -8, "原禄逢限忌(禄逢冲破)");
  if (dLu !== -1 && dLu === oJi) add(dLu, -4, "原忌逢限禄(绝处逢生)");
  if (dLu !== -1 && dLu === dJi) add(dLu, -8, "限禄战限忌(双重消耗)");

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
      const physBranch = BRANCHES[targetPhysIdx]; 
      const physName = basePalaces.find((p:any)=>p.earthlyBranch === physBranch)?.name.replace('宫', '') + '宫';

      // 绝对物理匹配，拒绝名次索引！
      const basePalaceData = baseScoresData.find((p: any) => p.earthlyBranch === physBranch);
      const bScore = Number(basePalaceData?.matrixScore ?? 0);

      const targetPhysicalPalace = basePalaces.find((p:any) => p.earthlyBranch === physBranch);
      const domainResult = calculateDomainBonus(domainIdx, targetPhysicalPalace);

      let aScore = 0;
      let aLogs: string[] = [];
      if ([0, 4, 6, 8].includes(domainIdx)) { 
        const patternsHere = basePatterns.filter(p => p.palaceIndex === targetPhysIdx);
        patternsHere.forEach(p => {
          if (!p.isAdvantage) {
            aScore += p.finalScore;
            aLogs.push(`✨ 【${p.patternName}】主场觉醒: ${p.finalScore > 0 ? '+' : ''}${p.finalScore}`);
          }
        });
      }

      let oScore = overlays.scores[targetPhysIdx];
      let oLogs = [...overlays.logs[targetPhysIdx]];
      
      const dJiIdx = getPhysIdxByMutagen(basePalaces, dec.heavenlyStem, '忌', dec.earthlyBranch); // Safe check
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

    overallTrends[decadeIndex] = {
      domainName: "综合大盘 (十二宫总计)",
      physicalPalace: "全盘",
      baseScore: Number(totalBase.toFixed(1)),
      domainScore: Number(totalDomain.toFixed(1)),
      domainLogs: ["已包含大运各宫位得位加总。"],
      activationScore: Number(totalAct.toFixed(1)),
      activationLogs: ["已包含大运各潜伏格局的觉醒加总。"],
      overlayScore: Number(totalOverlay.toFixed(1)),
      overlayLogs: ["已包含大运四化及八吉六煞整体叠加总和。"],
      totalDelta: Number((totalBase + totalDomain + totalAct + totalOverlay).toFixed(1))
    };
  });

  return { palaceTrends, overallTrends, decadeLabels };
}

// 辅助方法，安全获取限忌位置
function getPhysIdxByMutagen(basePalaces: any[], stem: string, m: string, branch: string) {
   const locs = getDecadeStarsLocations(stem, branch);
   if (m === '忌') {
      const starName = locs.sihua[3];
      const p = basePalaces.find(p => hasStar(p, starName));
      return p ? getBranchIndex(p.earthlyBranch) : -1;
   }
   return -1;
}
