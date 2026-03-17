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

  const decBranchIdx = getBranchIndex(branch);
  const luanIdx = (11 - decBranchIdx + 12) % 12;
  const xiIdx = (luanIdx + 6) % 12;

  return {
    yang: getBranchIndex(yangTuoMap[stem]?.[0] || ''), tuo: getBranchIndex(yangTuoMap[stem]?.[1] || ''),
    kui: getBranchIndex(kuiYueMap[stem]?.[0] || ''), yue: getBranchIndex(kuiYueMap[stem]?.[1] || ''),
    chang: getBranchIndex(changQuMap[stem]?.[0] || ''), qu: getBranchIndex(changQuMap[stem]?.[1] || ''),
    luCun: getBranchIndex(luCunMap[stem] || ''), ma: getBranchIndex(maMap[branch] || ''),
    luan: luanIdx, xi: xiIdx,
    sihua: SIHUA_MAP[stem] || []
  };
};

// 🚀 致命 Bug 修复：开启三级雷达，彻底解封 adjectiveStars (红鸾天喜等杂曜)！
const hasStar = (palace: any, starName: string) => {
  const stars = [...(palace.majorStars||[]), ...(palace.minorStars||[]), ...(palace.adjectiveStars||[])];
  return stars.some((s:any) => s.name.includes(starName) || (starName==='化禄' && s.mutagen==='禄') || (starName==='化权' && s.mutagen==='权') || (starName==='化科' && s.mutagen==='科') || (starName==='化忌' && s.mutagen==='忌'));
};
const getStarObj = (palace: any, starName: string) => {
  const stars = [...(palace.majorStars||[]), ...(palace.minorStars||[]), ...(palace.adjectiveStars||[])];
  return stars.find((s:any) => s.name.includes(starName));
};

function calculateDomainBonus(domainIdx: number, physicalPalace: any) {
  let score = 0; let logs: string[] = [];
  const add = (s: number, r: string) => { if (s !== 0) { score += s; logs.push(`${r}: ${s>0?'+':''}${s}`); } };

  if (domainIdx === 4) {
    if (hasStar(physicalPalace, '武曲') || hasStar(physicalPalace, '天府') || hasStar(physicalPalace, '太阴')) add(1, "财宫逢武/府/阴");
    if (hasStar(physicalPalace, '禄存') || hasStar(physicalPalace, '化禄')) add(2, "财宫逢双禄");
    if (hasStar(physicalPalace, '太阳') || hasStar(physicalPalace, '破军')) add(-1, "财宫逢阳/破");
    if (hasStar(physicalPalace, '地空') || hasStar(physicalPalace, '地劫')) add(-2, "财宫逢空劫");
  }
  if ([2, 1, 7, 3, 11].includes(domainIdx)) {
    if (hasStar(physicalPalace, '七杀') || hasStar(physicalPalace, '破军') || hasStar(physicalPalace, '武曲') || hasStar(physicalPalace, '巨门')) add(-1, "六亲逢耗星");
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
  const allStars = [...(physicalPalace.majorStars||[]), ...(physicalPalace.minorStars||[]), ...(physicalPalace.adjectiveStars||[])];
  if (allStars.some(s => s.mutagen === '忌')) {
    if (domainIdx === 8 || domainIdx === 6) add(-2, "官/迁逢化忌");
    if (domainIdx === 10) add(-2, "福德逢化忌");
  }
  return { score, logs };
}

function calculatePhysicalOverlay(basePalaces: any[], decStem: string, decBranch: string) {
  const scores = Array(12).fill(0);
  const logs = Array.from({ length: 12 }).map(() => [] as string[]);

  const decLocs = getDecadeStarsLocations(decStem, decBranch);
  const dKui = decLocs.kui, dYue = decLocs.yue, dYang = decLocs.yang, dTuo = decLocs.tuo;
  const dChang = decLocs.chang, dQu = decLocs.qu, dLuCun = decLocs.luCun, dMa = decLocs.ma;
  const dLuan = decLocs.luan, dXi = decLocs.xi; 
  
  const dLu = getBranchIndex(basePalaces.find(p => hasStar(p, decLocs.sihua[0]))?.earthlyBranch || '');
  const dQuan = getBranchIndex(basePalaces.find(p => hasStar(p, decLocs.sihua[1]))?.earthlyBranch || '');
  const dKe = getBranchIndex(basePalaces.find(p => hasStar(p, decLocs.sihua[2]))?.earthlyBranch || '');
  const dJi = getBranchIndex(basePalaces.find(p => hasStar(p, decLocs.sihua[3]))?.earthlyBranch || '');

  const getOStarPos = (sName: string) => { const p = basePalaces.find(p => hasStar(p, sName)); return p ? getBranchIndex(p.earthlyBranch) : -1; };
  const getOMutaPos = (m: string) => { const p = basePalaces.find(p => [...(p.majorStars||[]), ...(p.minorStars||[]), ...(p.adjectiveStars||[])].some(s => s.mutagen === m)); return p ? getBranchIndex(p.earthlyBranch) : -1; };

  const oKui = getOStarPos('天魁'), oYue = getOStarPos('天钺'), oYang = getOStarPos('擎羊'), oTuo = getOStarPos('陀罗');
  const oChang = getOStarPos('文昌'), oQu = getOStarPos('文曲'), oLuCun = getOStarPos('禄存'), oMa = getOStarPos('天马');
  const oLuan = getOStarPos('红鸾'), oXi = getOStarPos('天喜');
  
  const oLu = getOMutaPos('禄'), oQuan = getOMutaPos('权'), oKe = getOMutaPos('科'), oJi = getOMutaPos('忌');
  const oLuArr: number[] = []; basePalaces.forEach((p, idx) => { if(hasStar(p,'化禄')||hasStar(p,'禄存')) oLuArr.push(idx); });

  for (let i = 0; i < 12; i++) {
    const opp = (i + 6) % 12, trA = (i + 4) % 12, trB = (i + 8) % 12;
    const add = (val: number, msg: string) => { if(val!==0) { scores[i]+=val; logs[i].push(`${msg}: ${val>0?'+':''}${val}`); } };
    const getRel = (pos: number) => pos === i ? 'target' : (pos === opp ? 'opp' : (pos === trA || pos === trB ? 'trine' : null));

    const evalPair = (p1: number, p2: number, n1: string, n2: string, isBad: boolean) => {
      const r1 = getRel(p1), r2 = getRel(p2);
      const sign = isBad ? -1 : 1;
      
      if (r1 && r2) {
        if (r1 === 'target' && r2 === 'target') add(sign * 6, `限${n1}${n2}(本宫成对)`);
        else if ((r1 === 'target' && r2 === 'opp') || (r1 === 'opp' && r2 === 'target')) add(sign * 5, `限${n1}${n2}(本对成对)`);
        else add(sign * 1, `限${n1}${n2}(三方成对)`); 
      } else {
        if (r1) {
          if (r1 === 'target') add(sign * 3, `限${n1}单见(本宫)`);
          else if (r1 === 'opp') add(sign * 2.4, `限${n1}单见(对宫)`);
          else add(sign * 0.5, `限${n1}单见(三方)`);
        }
        if (r2) {
          if (r2 === 'target') add(sign * 3, `限${n2}单见(本宫)`);
          else if (r2 === 'opp') add(sign * 2.4, `限${n2}单见(对宫)`);
          else add(sign * 0.5, `限${n2}单见(三方)`);
        }
      }
    };
    
    evalPair(dKui, dYue, '魁', '钺', false); 
    evalPair(dChang, dQu, '昌', '曲', false); 
    evalPair(dLuCun, dMa, '禄存', '马', false);
    evalPair(dLuan, dXi, '鸾', '喜', false); 
    evalPair(dYang, dTuo, '羊', '陀', true);

    // 🌟 终极统合共振矩阵 (完美处理 4星共振 与 降级共振，补充对宫与三合的交叉死角)
    const evalUnifiedPairOverlay = (o1: number, o2: number, d1: number, d2: number, n1: string, n2: string, isBad: boolean) => {
      const sign = isBad ? -1 : 1;
      const ro1 = getRel(o1), ro2 = getRel(o2), rd1 = getRel(d1), rd2 = getRel(d2);

      const oAxis = (ro1 === 'target' && ro2 === 'opp') || (ro1 === 'opp' && ro2 === 'target');
      const dAxis = (rd1 === 'target' && rd2 === 'opp') || (rd1 === 'opp' && rd2 === 'target');
      const oTrine = (ro1 === 'trine' && ro2 === 'trine');
      const dTrine = (rd1 === 'trine' && rd2 === 'trine');
      const oSame = (ro1 === 'target' && ro2 === 'target');
      const dSame = (rd1 === 'target' && rd2 === 'target');

      // 1. 完美成对覆盖 (鸾喜如果对齐轴线，就会触发)
      if (oSame && dSame) { add(8 * sign, `原${n1}${n2}+限${n1}${n2}(同宫成对)`); return; }
      if (oAxis && dAxis) { add(8 * sign, `原${n1}${n2}+限${n1}${n2}(本对成对共振)`); return; }
      if (oTrine && dTrine) { add(4 * sign, `原${n1}${n2}+限${n1}${n2}(三方成对共振)`); return; }

      // 2. 降级交叉覆盖 (引入 opp+trine 的全部交叉视野)
      const evalSingle = (ox: number, dy: number, sO: string, sD: string) => {
        const ro = getRel(ox), rd = getRel(dy);
        if (!ro || !rd) return;
        const isSame = (sO === sD);
        if (ro === 'target' && rd === 'target') add((isSame ? 4 : 6) * sign, `原${sO}+限${sD}(同宫)`);
        else if (ro === 'target' && rd === 'opp') add((isSame ? 2 : 3) * sign, `原本宫${sO}逢限${sD}(对宫)`);
        else if (ro === 'opp' && rd === 'target') add((isSame ? 2 : 3) * sign, `限本宫${sD}逢原${sO}(对宫)`);
        else if (ro === 'target' && rd === 'trine') add((isSame ? 1 : 2) * sign, `原本宫${sO}会限${sD}(三方)`);
        else if (ro === 'trine' && rd === 'target') add((isSame ? 1 : 2) * sign, `限本宫${sD}会原${sO}(三方)`);
        else if (ro === 'trine' && rd === 'trine') add((isSame ? 1 : 2) * sign, `原三方${sO}会限${sD}(三合)`);
        else if (ro === 'opp' && rd === 'opp') add((isSame ? 2 : 3) * sign, `原对宫${sO}逢限${sD}(对宫)`);
        else if (ro === 'opp' && rd === 'trine') add((isSame ? 1 : 2) * sign, `原对宫${sO}会限${sD}(三方)`);
        else if (ro === 'trine' && rd === 'opp') add((isSame ? 1 : 2) * sign, `原三方${sO}会限${sD}(对宫)`);
      };

      evalSingle(o1, d1, n1, n1);
      evalSingle(o2, d2, n2, n2);
      evalSingle(o1, d2, n1, n2);
      evalSingle(o2, d1, n2, n1);
    };

    evalUnifiedPairOverlay(oKui, oYue, dKui, dYue, '魁', '钺', false);
    evalUnifiedPairOverlay(oChang, oQu, dChang, dQu, '昌', '曲', false);
    evalUnifiedPairOverlay(oLuan, oXi, dLuan, dXi, '鸾', '喜', false);
    evalUnifiedPairOverlay(oYang, oTuo, dYang, dTuo, '羊', '陀', true);

    const evalSihuaBase = (p: number, name: string, score: number) => {
      const r = getRel(p);
      if (r === 'target') add(score, `限${name}入本宫`);
      if (r === 'opp') add(Number((score * 0.8).toFixed(1)), `限${name}照对宫`);
      if (r === 'trine') add(Number((score * 0.5).toFixed(1)), `限${name}会三方`);
    };
    evalSihuaBase(dLu, '禄', 10);
    evalSihuaBase(dQuan, '权', 7);
    evalSihuaBase(dKe, '科', 5);
    if (dJi !== -1) {
      const decLifeIdx = getBranchIndex(decBranch);
      const jiDomainIdx = (decLifeIdx - dJi + 12) % 12;
      const jiScore = SELF_DOMAINS.includes(jiDomainIdx) ? -3 : -5;
      evalSihuaBase(dJi, `忌(${SELF_DOMAINS.includes(jiDomainIdx)?'我':'他'})`, jiScore);
    }

    const applySihuaSame = (opArr: number[], dp: number, name: string, score: number) => {
      const dr = getRel(dp);
      opArr.forEach(op => {
        if (op === -1) return;
        const or = getRel(op);
        const oppScore = name === '忌' ? -8 : (name === '禄' ? 8 : Number((score * 0.8).toFixed(1)));
        const trineScore = name === '忌' ? -5 : (name === '禄' ? 5 : Number((score * 0.5).toFixed(1)));
        
        if (or === 'target' && dr === 'target') add(score, `原${name}限${name}(同宫)`);
        if (or === 'target' && dr === 'opp') add(oppScore, `原本宫${name}冲限${name}(对宫)`);
        if (or === 'opp' && dr === 'target') add(oppScore, `限本宫${name}冲原${name}(对宫)`);
        if (or === 'target' && dr === 'trine') add(trineScore, `原本宫${name}会限${name}(三方)`);
        if (or === 'trine' && dr === 'target') add(trineScore, `限本宫${name}会原${name}(三方)`);
        if (or === 'trine' && dr === 'trine') add(trineScore, `原三方${name}会限${name}(三合共振)`);
        if (or === 'opp' && dr === 'opp') add(oppScore, `原对宫${name}冲限${name}(对宫共振)`);
        if (or === 'opp' && dr === 'trine') add(trineScore, `原对宫${name}会限${name}(三方)`);
        if (or === 'trine' && dr === 'opp') add(oppScore, `原三方${name}冲限${name}(对宫)`);
      });
    }
    applySihuaSame(oLuArr, dLu, '禄', 10);
    applySihuaSame(oQuan !== -1 ? [oQuan] : [], dQuan, '权', 7);
    applySihuaSame(oKe !== -1 ? [oKe] : [], dKe, '科', 5);
    applySihuaSame(oJi !== -1 ? [oJi] : [], dJi, '忌', -10);

    const applyCrossSihua = (op: number, dp: number, oName: string, dName: string) => {
      if (op === -1 || dp === -1) return;
      const or = getRel(op), dr = getRel(dp);
      if (or === 'target' && dr === 'target') add(3, `原${oName}限${dName}(同宫)`);
      if (or === 'target' && dr === 'opp') add(2, `原本宫${oName}遇限${dName}(对宫)`);
      if (or === 'opp' && dr === 'target') add(2, `限本宫${dName}遇原${oName}(对宫)`);
      if (or === 'target' && dr === 'trine') add(1, `原本宫${oName}会限${dName}(三方)`);
      if (or === 'trine' && dr === 'target') add(1, `限本宫${dName}会原${oName}(三方)`);
      if (or === 'trine' && dr === 'trine') add(1, `原三方${oName}会限${dName}(三合共振)`);
      if (or === 'opp' && dr === 'opp') add(2, `原对宫${oName}遇限${dName}(对宫共振)`);
      if (or === 'opp' && dr === 'trine') add(1, `原对宫${oName}会限${dName}(三方)`);
      if (or === 'trine' && dr === 'opp') add(2, `原三方${oName}遇限${dName}(对宫)`);
    };
    oLuArr.forEach(ol => {
      applyCrossSihua(ol, dQuan, '禄', '权'); applyCrossSihua(ol, dKe, '禄', '科');
    });
    applyCrossSihua(oQuan, dLu, '权', '禄'); applyCrossSihua(oQuan, dKe, '权', '科');
    applyCrossSihua(oKe, dLu, '科', '禄'); applyCrossSihua(oKe, dQuan, '科', '权');

    const applyDecGoodOrigJi = (dp: number, dName: string) => {
      if (dp === -1 || oJi === -1) return;
      const dr = getRel(dp), or = getRel(oJi);
      const sameScore = dName === '禄' ? -4 : -2; 
      if (dr === 'target' && or === 'target') add(sameScore, `原忌限${dName}(同宫受困)`);
      if (dr === 'target' && or === 'opp') add(-1, `限本宫${dName}冲原忌(对宫)`);
      if (or === 'target' && dr === 'opp') add(-1, `原本宫忌冲限${dName}(对宫)`);
      if (dr === 'target' && or === 'trine') add(-0.5, `限本宫${dName}会原忌(三方)`);
      if (or === 'target' && dr === 'trine') add(-0.5, `原本宫忌会限${dName}(三方)`);
      if (dr === 'trine' && or === 'trine') add(-0.5, `原三方忌会限${dName}(三合共振)`);
      if (dr === 'opp' && or === 'opp') add(-1, `原对宫忌冲限${dName}(对宫共振)`);
      if (dr === 'opp' && or === 'trine') add(-0.5, `限对宫${dName}会原忌(三方)`);
      if (dr === 'trine' && or === 'opp') add(-1, `限三方${dName}冲原忌(对宫)`);
    }
    applyDecGoodOrigJi(dLu, '禄');
    applyDecGoodOrigJi(dQuan, '权');
    applyDecGoodOrigJi(dKe, '科');

    oLuArr.forEach(ol => {
      if (ol !== -1 && dJi !== -1) {
        const or = getRel(ol), dr = getRel(dJi);
        if (or === 'target' && dr === 'target') add(-8, "原本宫禄逢限忌(同宫大破)");
        else if (or === 'target' && dr === 'opp') add(-4, "原本宫禄冲限忌(对宫大破)");
        else if (or === 'opp' && dr === 'target') add(-4, "限本宫忌冲原禄(对宫大破)");
        else if (or === 'target' && dr === 'trine') add(-2, "原本宫禄会限忌(三方大破)");
        else if (or === 'trine' && dr === 'target') add(-2, "限本宫忌会原禄(三方大破)");
        else if (or === 'trine' && dr === 'trine') add(-2, "原三方禄会限忌(三合大破)");
        else if (or === 'opp' && dr === 'opp') add(-4, "原对宫禄冲限忌(对宫大破)");
        else if (or === 'opp' && dr === 'trine') add(-2, "原对宫禄会限忌(三方大破)");
        else if (or === 'trine' && dr === 'opp') add(-4, "原三方禄冲限忌(对宫大破)");
      }
    });

    if (dLu !== -1 && dJi !== -1) {
       const lr = getRel(dLu), jr = getRel(dJi);
       if (lr === 'target' && jr === 'target') add(-8, "限禄战限忌(同宫消耗)");
       else if ((lr === 'target' && jr === 'opp') || (lr === 'opp' && jr === 'target')) add(-4, "限禄战限忌(本对消耗)");
       else if ((lr === 'target' && jr === 'trine') || (lr === 'trine' && jr === 'target')) add(-2, "限禄战限忌(三方消耗)");
       else if (lr === 'trine' && jr === 'trine') add(-2, "限禄战限忌(三合消耗)");
       else if (lr === 'opp' && jr === 'opp') add(-4, "限禄战限忌(对宫消耗)");
       else if ((lr === 'opp' && jr === 'trine') || (lr === 'trine' && jr === 'opp')) add(-2, "限禄战限忌(三方消耗)");
    }
  }

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

      const basePalaceData = baseScoresData.find((p: any) => p.earthlyBranch === physBranch);
      const bScore = Number(basePalaceData?.matrixScore ?? 0);
      const targetPhysicalPalace = basePalaces.find((p:any) => p.earthlyBranch === physBranch);
      const domainResult = calculateDomainBonus(domainIdx, targetPhysicalPalace);

      let aScore = 0; let aLogs: string[] = [];
      if ([0, 4, 6, 8].includes(domainIdx)) { 
        const patternsHere = basePatterns.filter(p => p.palaceIndex === targetPhysIdx);
        patternsHere.forEach(p => {
          if (!p.isAdvantage) {
            aScore += p.finalScore; aLogs.push(`✨ 【${p.patternName}】主场觉醒: ${p.finalScore > 0 ? '+' : ''}${p.finalScore}`);
          }
        });
      }

      let oScore = overlays.scores[targetPhysIdx];
      let oLogs = [...overlays.logs[targetPhysIdx]];
      
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
      totalBase += bScore; totalDomain += domainResult.score; totalAct += aScore; totalOverlay += oScore;
    }

    const overallOverlayLogs: string[] = [];
    for(let i=0; i<12; i++) {
        overallOverlayLogs.push(`[${DECADE_NAMES[i]}] 共振叠加: ${palaceTrends[i][decadeIndex].overlayScore > 0 ? '+' : ''}${palaceTrends[i][decadeIndex].overlayScore}`);
    }

    overallTrends[decadeIndex] = {
      domainName: "综合大盘 (十二宫总计)", physicalPalace: "全盘",
      baseScore: Number(totalBase.toFixed(1)), domainScore: Number(totalDomain.toFixed(1)), domainLogs: ["已包含大运各宫位得位加总。"],
      activationScore: Number(totalAct.toFixed(1)), activationLogs: ["已包含大运各潜伏格局的觉醒加总。"],
      overlayScore: Number(totalOverlay.toFixed(1)), overlayLogs: overallOverlayLogs,
      totalDelta: Number((totalBase + totalDomain + totalAct + totalOverlay).toFixed(1))
    };
  });
  return { palaceTrends, overallTrends, decadeLabels };
}
