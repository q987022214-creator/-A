import { PatternResult } from './patternRecognizer';
import { VCoreEngine, Vector5D, PalaceContext, VectorMath } from './vCoreEngine';
import { STEM_MUTAGENS } from './scoreCalculator';

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
  vector5D?: Vector5D;
}

export interface LifeTrendMatrix {
  palaceTrends: DynamicPalaceDelta[][];
  overallTrends: DynamicPalaceDelta[];
  labels: string[]; 
}

const DECADE_NAMES = ['命宫', '兄弟宫', '夫妻宫', '子女宫', '财帛宫', '疾厄宫', '迁移宫', '交友宫', '官禄宫', '田宅宫', '福德宫', '父母宫'];
const SELF_DOMAINS = [0, 4, 8, 9, 5, 10]; 

const BRANCHES = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"];
const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const getBranchIndex = (branch: string) => BRANCHES.indexOf(branch);
const getStemIndex = (stem: string) => STEMS.indexOf(stem);

const SIHUA_MAP: Record<string, string[]> = {
  '甲': ['廉贞', '破军', '武曲', '太阳'], '乙': ['天机', '天梁', '紫微', '太阴'],
  '丙': ['天同', '天机', '文昌', '廉贞'], '丁': ['太阴', '天同', '天机', '巨门'],
  '戊': ['贪狼', '太阴', '右弼', '天机'], '己': ['武曲', '贪狼', '天梁', '文曲'],
  '庚': ['太阳', '武曲', '太阴', '天同'], '辛': ['巨门', '太阳', '文曲', '文昌'],
  '壬': ['天梁', '紫微', '左辅', '武曲'], '癸': ['破军', '巨门', '太阴', '贪狼']
};

const getDynamicStarsLocations = (stem: string, branch: string) => {
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

  const branchIdx = getBranchIndex(branch);
  const luanIdx = (11 - branchIdx + 12) % 12;
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

const hasStar = (palace: any, starName: string) => {
  const stars = [...(palace.majorStars||[]), ...(palace.minorStars||[]), ...(palace.adjectiveStars||[])];
  return stars.some((s:any) => s.name.includes(starName) || (starName==='化禄' && s.mutagen==='禄') || (starName==='化权' && s.mutagen==='权') || (starName==='化科' && s.mutagen==='科') || (starName==='化忌' && s.mutagen==='忌'));
};
const getStarObj = (palace: any, starName: string) => {
  const stars = [...(palace.majorStars||[]), ...(palace.minorStars||[]), ...(palace.adjectiveStars||[])];
  return stars.find((s:any) => s.name.includes(starName));
};

export function mapToPalaceContext(palace: any): PalaceContext {
  const mainStars = (palace.majorStars || []).map((s: any) => s.name);
  const minorStars = (palace.minorStars || []).map((s: any) => s.name);
  const mutagens: string[] = [];
  [...(palace.majorStars || []), ...(palace.minorStars || [])].forEach((s: any) => {
    if (s.mutagen) mutagens.push(s.mutagen);
  });

  // Calculate self-mutagen
  const stem = palace.heavenlyStem;
  const stemMutagens = STEM_MUTAGENS[stem] || [];
  const selfMutagenObj = stemMutagens.find(m => mainStars.includes(m.star));
  const selfMutagen = selfMutagenObj ? selfMutagenObj.mutagen : null;

  return {
    branch: palace.earthlyBranch,
    mainStars,
    minorStars,
    mutagens,
    selfMutagen
  };
}

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

function performOverlayRadar(basePalaces: any[], baseStem: string, baseBranch: string, dynStem: string, dynBranch: string, isYearly: boolean = false) {
  const scores = Array(12).fill(0);
  const logs = Array.from({ length: 12 }).map(() => [] as string[]);
  
  const layer1Name = isYearly ? '限' : '原';
  const layer2Name = isYearly ? '流' : '限';

  const dLocs = getDynamicStarsLocations(dynStem, dynBranch);
  const dKui = dLocs.kui, dYue = dLocs.yue, dYang = dLocs.yang, dTuo = dLocs.tuo;
  const dChang = dLocs.chang, dQu = dLocs.qu, dLuCun = dLocs.luCun, dMa = dLocs.ma;
  const dLuan = dLocs.luan, dXi = dLocs.xi; 
  
  let oKui=-1, oYue=-1, oYang=-1, oTuo=-1, oChang=-1, oQu=-1, oLuCun=-1, oMa=-1, oLuan=-1, oXi=-1;
  let oLu=-1, oQuan=-1, oKe=-1, oJi=-1;
  let oLuArr: number[] = [];

  const dLu = getBranchIndex(basePalaces.find(p => hasStar(p, dLocs.sihua[0]))?.earthlyBranch || '');
  const dQuan = getBranchIndex(basePalaces.find(p => hasStar(p, dLocs.sihua[1]))?.earthlyBranch || '');
  const dKe = getBranchIndex(basePalaces.find(p => hasStar(p, dLocs.sihua[2]))?.earthlyBranch || '');
  const dJi = getBranchIndex(basePalaces.find(p => hasStar(p, dLocs.sihua[3]))?.earthlyBranch || '');

  if (isYearly) {
    const oLocs = getDynamicStarsLocations(baseStem, baseBranch);
    oKui=oLocs.kui; oYue=oLocs.yue; oYang=oLocs.yang; oTuo=oLocs.tuo;
    oChang=oLocs.chang; oQu=oLocs.qu; oLuCun=oLocs.luCun; oMa=oLocs.ma;
    oLuan=oLocs.luan; oXi=oLocs.xi;
    oLu = getBranchIndex(basePalaces.find(p => hasStar(p, oLocs.sihua[0]))?.earthlyBranch || '');
    oQuan = getBranchIndex(basePalaces.find(p => hasStar(p, oLocs.sihua[1]))?.earthlyBranch || '');
    oKe = getBranchIndex(basePalaces.find(p => hasStar(p, oLocs.sihua[2]))?.earthlyBranch || '');
    oJi = getBranchIndex(basePalaces.find(p => hasStar(p, oLocs.sihua[3]))?.earthlyBranch || '');
    if(oLu !== -1) oLuArr.push(oLu);
    if(oLuCun !== -1) oLuArr.push(oLuCun);
  } else {
    const getOPos = (s:string) => {const p = basePalaces.find(p=>hasStar(p,s)); return p?getBranchIndex(p.earthlyBranch):-1;};
    const getOMut = (m:string) => {const p = basePalaces.find(p=>[...(p.majorStars||[]), ...(p.minorStars||[]), ...(p.adjectiveStars||[])].some(s=>s.mutagen===m)); return p?getBranchIndex(p.earthlyBranch):-1;};
    oKui=getOPos('天魁'); oYue=getOPos('天钺'); oYang=getOPos('擎羊'); oTuo=getOPos('陀罗');
    oChang=getOPos('文昌'); oQu=getOPos('文曲'); oLuCun=getOPos('禄存'); oMa=getOPos('天马');
    oLuan=getOPos('红鸾'); oXi=getOPos('天喜');
    oLu=getOMut('禄'); oQuan=getOMut('权'); oKe=getOMut('科'); oJi=getOMut('忌');
    basePalaces.forEach((p, idx) => { if(hasStar(p,'化禄')||hasStar(p,'禄存')) oLuArr.push(idx); });
  }

  for (let i = 0; i < 12; i++) {
    const opp = (i + 6) % 12, trA = (i + 4) % 12, trB = (i + 8) % 12;
    const add = (val: number, msg: string) => { if(val!==0) { scores[i]+=val; logs[i].push(`${msg}: ${val>0?'+':''}${val}`); } };
    const getRel = (pos: number) => pos === i ? 'target' : (pos === opp ? 'opp' : (pos === trA || pos === trB ? 'trine' : null));

    const evalPair = (p1: number, p2: number, n1: string, n2: string, isBad: boolean) => {
      const r1 = getRel(p1), r2 = getRel(p2);
      const sign = isBad ? -1 : 1;
      if (r1 && r2) {
        if (r1 === 'target' && r2 === 'target') add(sign * 6, `${layer2Name}${n1}${n2}(本宫成对)`);
        else if ((r1 === 'target' && r2 === 'opp') || (r1 === 'opp' && r2 === 'target')) add(sign * 5, `${layer2Name}${n1}${n2}(本对成对)`);
        else add(sign * 1, `${layer2Name}${n1}${n2}(三方成对)`); 
      } else {
        if (r1) {
          if (r1 === 'target') add(sign * 3, `${layer2Name}${n1}单见(本宫)`);
          else if (r1 === 'opp') add(sign * 2.4, `${layer2Name}${n1}单见(对宫)`);
          else add(sign * 0.5, `${layer2Name}${n1}单见(三方)`);
        }
        if (r2) {
          if (r2 === 'target') add(sign * 3, `${layer2Name}${n2}单见(本宫)`);
          else if (r2 === 'opp') add(sign * 2.4, `${layer2Name}${n2}单见(对宫)`);
          else add(sign * 0.5, `${layer2Name}${n2}单见(三方)`);
        }
      }
    };
    
    evalPair(dLocs.kui, dLocs.yue, '魁', '钺', false); 
    evalPair(dLocs.chang, dLocs.qu, '昌', '曲', false); 
    evalPair(dLocs.luCun, dLocs.ma, '禄存', '马', false);
    evalPair(dLocs.luan, dLocs.xi, '鸾', '喜', false); 
    evalPair(dLocs.yang, dLocs.tuo, '羊', '陀', true);

    const evalUnifiedPairOverlay = (o1: number, o2: number, d1: number, d2: number, n1: string, n2: string, isBad: boolean) => {
      const sign = isBad ? -1 : 1;
      const ro1 = getRel(o1), ro2 = getRel(o2), rd1 = getRel(d1), rd2 = getRel(d2);
      const oAxis = (ro1 === 'target' && ro2 === 'opp') || (ro1 === 'opp' && ro2 === 'target');
      const dAxis = (rd1 === 'target' && rd2 === 'opp') || (rd1 === 'opp' && rd2 === 'target');
      const oTrine = (ro1 === 'trine' && ro2 === 'trine');
      const dTrine = (rd1 === 'trine' && rd2 === 'trine');
      const oSame = (ro1 === 'target' && ro2 === 'target');
      const dSame = (rd1 === 'target' && rd2 === 'target');

      if (oSame && dSame) { add(8 * sign, `${layer1Name}${n1}${n2}+${layer2Name}${n1}${n2}(同宫成对)`); return; }
      if (oAxis && dAxis) { add(8 * sign, `${layer1Name}${n1}${n2}+${layer2Name}${n1}${n2}(本对共振)`); return; }
      if (oTrine && dTrine) { add(4 * sign, `${layer1Name}${n1}${n2}+${layer2Name}${n1}${n2}(三方共振)`); return; }

      const evalSingle = (ox: number, dy: number, sO: string, sD: string) => {
        const ro = getRel(ox), rd = getRel(dy);
        if (!ro || !rd) return;
        const isSame = (sO === sD);
        if (ro === 'target' && rd === 'target') add((isSame ? 4 : 6) * sign, `${layer1Name}${sO}+${layer2Name}${sD}(同宫)`);
        else if (ro === 'target' && rd === 'opp') add((isSame ? 2 : 3) * sign, `${layer1Name}本宫${sO}逢${layer2Name}${sD}(对宫)`);
        else if (ro === 'opp' && rd === 'target') add((isSame ? 2 : 3) * sign, `${layer2Name}本宫${sD}逢${layer1Name}${sO}(对宫)`);
        else if (ro === 'target' && rd === 'trine') add((isSame ? 1 : 2) * sign, `${layer1Name}本宫${sO}会${layer2Name}${sD}(三方)`);
        else if (ro === 'trine' && rd === 'target') add((isSame ? 1 : 2) * sign, `${layer2Name}本宫${sD}会${layer1Name}${sO}(三方)`);
        else if (ro === 'trine' && rd === 'trine') add((isSame ? 1 : 2) * sign, `${layer1Name}三方${sO}会${layer2Name}${sD}(三合共振)`);
        else if (ro === 'opp' && rd === 'opp') add((isSame ? 2 : 3) * sign, `${layer1Name}对宫${sO}逢${layer2Name}${sD}(对宫共振)`);
        else if (ro === 'opp' && rd === 'trine') add((isSame ? 1 : 2) * sign, `${layer1Name}对宫${sO}会${layer2Name}${sD}(三方)`);
        else if (ro === 'trine' && rd === 'opp') add((isSame ? 1 : 2) * sign, `${layer1Name}三方${sO}会${layer2Name}${sD}(对宫)`);
      };
      evalSingle(o1, d1, n1, n1); evalSingle(o2, d2, n2, n2);
      evalSingle(o1, d2, n1, n2); evalSingle(o2, d1, n2, n1);
    };

    evalUnifiedPairOverlay(oKui, oYue, dLocs.kui, dLocs.yue, '魁', '钺', false);
    evalUnifiedPairOverlay(oChang, oQu, dLocs.chang, dLocs.qu, '昌', '曲', false);
    evalUnifiedPairOverlay(oLuan, oXi, dLocs.luan, dLocs.xi, '鸾', '喜', false);
    evalUnifiedPairOverlay(oYang, oTuo, dLocs.yang, dLocs.tuo, '羊', '陀', true);

    const evalSihuaBase = (p: number, name: string, score: number) => {
      const r = getRel(p);
      if (r === 'target') add(score, `${layer2Name}${name}入本宫`);
      if (r === 'opp') add(Number((score * 0.8).toFixed(1)), `${layer2Name}${name}照对宫`);
      if (r === 'trine') add(Number((score * 0.5).toFixed(1)), `${layer2Name}${name}会三方`);
    };
    evalSihuaBase(dLu, '禄', 10); evalSihuaBase(dQuan, '权', 7); evalSihuaBase(dKe, '科', 5);
    if (dJi !== -1) {
      const bIdx = getBranchIndex(dynBranch);
      const jiDomainIdx = (bIdx - dJi + 12) % 12;
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
        
        if (or === 'target' && dr === 'target') add(score, `${layer1Name}${name}${layer2Name}${name}(同宫)`);
        if (or === 'target' && dr === 'opp') add(oppScore, `${layer1Name}本宫${name}冲${layer2Name}${name}(对宫)`);
        if (or === 'opp' && dr === 'target') add(oppScore, `${layer2Name}本宫${name}冲${layer1Name}${name}(对宫)`);
        if (or === 'target' && dr === 'trine') add(trineScore, `${layer1Name}本宫${name}会${layer2Name}${name}(三方)`);
        if (or === 'trine' && dr === 'target') add(trineScore, `${layer2Name}本宫${name}会${layer1Name}${name}(三方)`);
        if (or === 'trine' && dr === 'trine') add(trineScore, `${layer1Name}三方${name}会${layer2Name}${name}(三合共振)`);
        if (or === 'opp' && dr === 'opp') add(oppScore, `${layer1Name}对宫${name}冲${layer2Name}${name}(对宫共振)`);
        if (or === 'opp' && dr === 'trine') add(trineScore, `${layer1Name}对宫${name}会${layer2Name}${name}(三方)`);
        if (or === 'trine' && dr === 'opp') add(oppScore, `${layer1Name}三方${name}冲${layer2Name}${name}(对宫)`);
      });
    }
    applySihuaSame(oLuArr, dLu, '禄', 10);
    applySihuaSame(oQuan !== -1 ? [oQuan] : [], dQuan, '权', 7);
    applySihuaSame(oKe !== -1 ? [oKe] : [], dKe, '科', 5);
    applySihuaSame(oJi !== -1 ? [oJi] : [], dJi, '忌', -10);

    const applyCrossSihua = (op: number, dp: number, oName: string, dName: string) => {
      if (op === -1 || dp === -1) return;
      const or = getRel(op), dr = getRel(dp);
      if (or === 'target' && dr === 'target') add(3, `${layer1Name}${oName}${layer2Name}${dName}(同宫)`);
      if (or === 'target' && dr === 'opp') add(2, `${layer1Name}本宫${oName}遇${layer2Name}${dName}(对宫)`);
      if (or === 'opp' && dr === 'target') add(2, `${layer2Name}本宫${dName}遇${layer1Name}${oName}(对宫)`);
      if (or === 'target' && dr === 'trine') add(1, `${layer1Name}本宫${oName}会${layer2Name}${dName}(三方)`);
      if (or === 'trine' && dr === 'target') add(1, `${layer2Name}本宫${dName}会${layer1Name}${oName}(三方)`);
      if (or === 'trine' && dr === 'trine') add(1, `${layer1Name}三方${oName}会${layer2Name}${dName}(三合共振)`);
      if (or === 'opp' && dr === 'opp') add(2, `${layer1Name}对宫${oName}遇${layer2Name}${dName}(对宫共振)`);
      if (or === 'opp' && dr === 'trine') add(1, `${layer1Name}对宫${oName}会${layer2Name}${dName}(三方)`);
      if (or === 'trine' && dr === 'opp') add(2, `${layer1Name}三方${oName}遇${layer2Name}${dName}(对宫)`);
    };
    oLuArr.forEach(ol => { applyCrossSihua(ol, dQuan, '禄', '权'); applyCrossSihua(ol, dKe, '禄', '科'); });
    applyCrossSihua(oQuan, dLu, '权', '禄'); applyCrossSihua(oQuan, dKe, '权', '科');
    applyCrossSihua(oKe, dLu, '科', '禄'); applyCrossSihua(oKe, dQuan, '科', '权');

    const applyJiClash = (dp: number, dName: string) => {
      if (dp === -1 || oJi === -1) return;
      const dr = getRel(dp), or = getRel(oJi);
      const sameScore = dName === '禄' ? -4 : -2; 
      if (dr === 'target' && or === 'target') add(sameScore, `${layer1Name}忌${layer2Name}${dName}(同宫受困)`);
      if (dr === 'target' && or === 'opp') add(-1, `${layer2Name}本宫${dName}冲${layer1Name}忌(对宫)`);
      if (or === 'target' && dr === 'opp') add(-1, `${layer1Name}本宫忌冲${layer2Name}${dName}(对宫)`);
      if (dr === 'target' && or === 'trine') add(-0.5, `${layer2Name}本宫${dName}会${layer1Name}忌(三方)`);
      if (or === 'target' && dr === 'trine') add(-0.5, `${layer1Name}本宫忌会${layer2Name}${dName}(三方)`);
      if (dr === 'trine' && or === 'trine') add(-0.5, `${layer1Name}三方忌会${layer2Name}${dName}(三合共振)`);
      if (dr === 'opp' && or === 'opp') add(-1, `${layer1Name}对宫忌冲${layer2Name}${dName}(对宫共振)`);
      if (dr === 'opp' && or === 'trine') add(-0.5, `${layer2Name}对宫${dName}会${layer1Name}忌(三方)`);
      if (dr === 'trine' && or === 'opp') add(-1, `${layer2Name}三方${dName}冲${layer1Name}忌(对宫)`);
    }
    applyJiClash(dLu, '禄'); applyJiClash(dQuan, '权'); applyJiClash(dKe, '科');

    oLuArr.forEach(ol => {
      if (ol !== -1 && dJi !== -1) {
        const or = getRel(ol), dr = getRel(dJi);
        if (or === 'target' && dr === 'target') add(-8, `${layer1Name}本宫禄逢${layer2Name}忌(同宫大破)`);
        else if (or === 'target' && dr === 'opp') add(-4, `${layer1Name}本宫禄冲${layer2Name}忌(对宫大破)`);
        else if (or === 'opp' && dr === 'target') add(-4, `${layer2Name}本宫忌冲${layer1Name}禄(对宫大破)`);
        else if (or === 'target' && dr === 'trine') add(-2, `${layer1Name}本宫禄会${layer2Name}忌(三方大破)`);
        else if (or === 'trine' && dr === 'target') add(-2, `${layer2Name}本宫忌会${layer1Name}禄(三方大破)`);
        else if (or === 'trine' && dr === 'trine') add(-2, `${layer1Name}三方禄会${layer2Name}忌(三合大破)`);
        else if (or === 'opp' && dr === 'opp') add(-4, `${layer1Name}对宫禄冲${layer2Name}忌(对宫大破)`);
        else if (or === 'opp' && dr === 'trine') add(-2, `${layer1Name}对宫禄会${layer2Name}忌(三方大破)`);
        else if (or === 'trine' && dr === 'opp') add(-4, `${layer1Name}三方禄冲${layer2Name}忌(对宫大破)`);
      }
    });

    if (dLu !== -1 && dJi !== -1) {
       const lr = getRel(dLu), jr = getRel(dJi);
       if (lr === 'target' && jr === 'target') add(-8, `${layer2Name}禄战${layer2Name}忌(同宫消耗)`);
       else if ((lr === 'target' && jr === 'opp') || (lr === 'opp' && jr === 'target')) add(-4, `${layer2Name}禄战${layer2Name}忌(本对消耗)`);
       else if ((lr === 'target' && jr === 'trine') || (lr === 'trine' && jr === 'target')) add(-2, `${layer2Name}禄战${layer2Name}忌(三方消耗)`);
       else if (lr === 'trine' && jr === 'trine') add(-2, `${layer2Name}禄战${layer2Name}忌(三合消耗)`);
       else if (lr === 'opp' && jr === 'opp') add(-4, `${layer2Name}禄战${layer2Name}忌(对宫消耗)`);
       else if ((lr === 'opp' && jr === 'trine') || (lr === 'trine' && jr === 'opp')) add(-2, `${layer2Name}禄战${layer2Name}忌(三方消耗)`);
    }
  }

  // === 🌠 三盘共振追加引擎 (仅在算流年时触发) ===
  if (isYearly) {
    const decLocs = getDynamicStarsLocations(baseStem, baseBranch); // 此时 base是decade
    const yrLocs = getDynamicStarsLocations(dynStem, dynBranch);    // 此时 dyn是year

    // 原局四化位置
    const getOMut = (m:string) => {const p = basePalaces.find(p=>[...(p.majorStars||[]), ...(p.minorStars||[]), ...(p.adjectiveStars||[])].some(s=>s.mutagen===m)); return p?getBranchIndex(p.earthlyBranch):-1;};
    const oLu=getOMut('禄'), oQuan=getOMut('权'), oKe=getOMut('科'), oJi=getOMut('忌');
    
    // 原局动态星位置 (天魁等)
    const getOPos = (s:string) => {const p = basePalaces.find(p=>hasStar(p,s)); return p?getBranchIndex(p.earthlyBranch):-1;};
    const oKui=getOPos('天魁'), oYue=getOPos('天钺'), oYang=getOPos('擎羊'), oTuo=getOPos('陀罗');
    const oChang=getOPos('文昌'), oQu=getOPos('文曲'), oLuCun=getOPos('禄存'), oMa=getOPos('天马');
    const oLuan=getOPos('红鸾'), oXi=getOPos('天喜');

    for (let i = 0; i < 12; i++) {
      const opp = (i + 6) % 12, trA = (i + 4) % 12, trB = (i + 8) % 12;
      const getRel = (pos: number) => pos === i ? 'target' : (pos === opp ? 'opp' : (pos === trA || pos === trB ? 'trine' : null));
      const add = (val: number, msg: string) => { if(val!==0) { scores[i]+=val; logs[i].push(`🌠 ${msg}: ${val>0?'+':''}${val}`); } };

      const evalTriple = (oPos: number, dPos: number, yPos: number, name: string, type: 'good' | 'bad' | 'sihua_good' | 'sihua_bad') => {
        if (oPos === -1 || dPos === -1 || yPos === -1) return;
        const rO = getRel(oPos), rD = getRel(dPos), rY = getRel(yPos);
        if (rO && rD && rY) {
          let pts = 0;
          if (rO === 'target' && rD === 'target' && rY === 'target') pts = type.includes('sihua') ? 16 : 5;
          else if (rO !== 'trine' && rD !== 'trine' && rY !== 'trine') pts = type.includes('sihua') ? 8 : 3; 
          else pts = type.includes('sihua') ? 5 : 1;
          if (type.includes('bad')) pts = -pts;
          add(pts, `三盘大共振(${name})`);
        }
      };

      evalTriple(oKui, decLocs.kui, yrLocs.kui, '魁', 'good'); evalTriple(oYue, decLocs.yue, yrLocs.yue, '钺', 'good');
      evalTriple(oChang, decLocs.chang, yrLocs.chang, '昌', 'good'); evalTriple(oQu, decLocs.qu, yrLocs.qu, '曲', 'good');
      evalTriple(oLuCun, decLocs.luCun, yrLocs.luCun, '禄存', 'good'); evalTriple(oMa, decLocs.ma, yrLocs.ma, '马', 'good');
      evalTriple(oLuan, decLocs.luan, yrLocs.luan, '鸾', 'good'); evalTriple(oXi, decLocs.xi, yrLocs.xi, '喜', 'good');
      evalTriple(oYang, decLocs.yang, yrLocs.yang, '羊', 'bad'); evalTriple(oTuo, decLocs.tuo, yrLocs.tuo, '陀', 'bad');
      
      const dLuPos = getBranchIndex(basePalaces.find(p => hasStar(p, decLocs.sihua[0]))?.earthlyBranch || '');
      const dQuanPos = getBranchIndex(basePalaces.find(p => hasStar(p, decLocs.sihua[1]))?.earthlyBranch || '');
      const dKePos = getBranchIndex(basePalaces.find(p => hasStar(p, decLocs.sihua[2]))?.earthlyBranch || '');
      const dJiPos = getBranchIndex(basePalaces.find(p => hasStar(p, decLocs.sihua[3]))?.earthlyBranch || '');
      
      const yLuPos = getBranchIndex(basePalaces.find(p => hasStar(p, yrLocs.sihua[0]))?.earthlyBranch || '');
      const yQuanPos = getBranchIndex(basePalaces.find(p => hasStar(p, yrLocs.sihua[1]))?.earthlyBranch || '');
      const yKePos = getBranchIndex(basePalaces.find(p => hasStar(p, yrLocs.sihua[2]))?.earthlyBranch || '');
      const yJiPos = getBranchIndex(basePalaces.find(p => hasStar(p, yrLocs.sihua[3]))?.earthlyBranch || '');

      evalTriple(oLu, dLuPos, yLuPos, '化禄', 'sihua_good');
      evalTriple(oQuan, dQuanPos, yQuanPos, '化权', 'sihua_good');
      evalTriple(oKe, dKePos, yKePos, '化科', 'sihua_good');
      evalTriple(oJi, dJiPos, yJiPos, '化忌', 'sihua_bad');
    }
  }

  return { scores, logs };
}

export function generateLifeTrendMatrix(basePalaces: any[], decades: any[], basePatterns: PatternResult[], baseScoresData: any[]): LifeTrendMatrix {
  const palaceTrends: DynamicPalaceDelta[][] = Array.from({ length: 12 }).map(() => Array(10).fill(null));
  const overallTrends: DynamicPalaceDelta[] = Array(10).fill(null);
  const labels: string[] = [];

  decades.slice(0, 10).forEach((dec: any, idx: number) => {
    labels.push(`${dec.range[0]}-${dec.range[1]}岁\n${dec.heavenlyStem}${dec.earthlyBranch}限`);
    const decLifeIdx = getBranchIndex(dec.earthlyBranch);
    const overlays = performOverlayRadar(basePalaces, '', '', dec.heavenlyStem, dec.earthlyBranch, false);

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
        basePatterns.filter(p => p.palaceIndex === targetPhysIdx && !p.isAdvantage).forEach(p => {
          aScore += p.finalScore; aLogs.push(`✨ 【${p.patternName}】主场觉醒: ${p.finalScore > 0 ? '+' : ''}${p.finalScore}`);
        });
      }

      let oScore = overlays.scores[targetPhysIdx];
      let oLogs = [...overlays.logs[targetPhysIdx]];
      
      // 🚀 V-Core 5D Vector Calculation
      const oppPhysIdx = (targetPhysIdx + 6) % 12;
      const oppPhysicalPalace = basePalaces.find((p:any) => p.earthlyBranch === BRANCHES[oppPhysIdx]);

      const natalContext = mapToPalaceContext(targetPhysicalPalace);
      const oppContext = mapToPalaceContext(oppPhysicalPalace);
      const natalVector = VCoreEngine.calculatePalaceVector(natalContext, oppContext);

      palaceTrends[domainIdx][idx] = {
        domainName: `大限${DECADE_NAMES[domainIdx]}`, physicalPalace: physName, baseScore: Number(bScore.toFixed(1)),
        domainScore: Number(domainResult.score.toFixed(1)), domainLogs: domainResult.logs,
        activationScore: Number(aScore.toFixed(1)), activationLogs: aLogs,
        overlayScore: Number(oScore.toFixed(1)), overlayLogs: oLogs,
        totalDelta: Number((bScore + domainResult.score + aScore + oScore).toFixed(1)),
        vector5D: natalVector
      };
      totalBase += bScore; totalDomain += domainResult.score; totalAct += aScore; totalOverlay += oScore;
    }

    const overallOverlayLogs: string[] = [];
    for(let i=0; i<12; i++) {
        overallOverlayLogs.push(`[${DECADE_NAMES[i]}] 大运共振: ${palaceTrends[i][idx].overlayScore > 0 ? '+' : ''}${palaceTrends[i][idx].overlayScore}`);
    }

    overallTrends[idx] = {
      domainName: "大限综合大盘 (十二宫总计)", physicalPalace: "全盘", baseScore: Number(totalBase.toFixed(1)),
      domainScore: Number(totalDomain.toFixed(1)), domainLogs: ["已包含大运各宫位得位加总。"],
      activationScore: Number(totalAct.toFixed(1)), activationLogs: ["已包含大运各潜伏格局的觉醒加总。"],
      overlayScore: Number(totalOverlay.toFixed(1)), overlayLogs: overallOverlayLogs,
      totalDelta: Number((totalBase + totalDomain + totalAct + totalOverlay).toFixed(1))
    };
  });
  return { palaceTrends, overallTrends, labels };
}

// 🚀 终极新增：流年推演矩阵引擎 (带三盘共振)
export function generateYearlyTrendMatrix(basePalaces: any[], decades: any[], basePatterns: PatternResult[], baseScoresData: any[], selectedDecadeIndex: number, birthYearStem: string, birthYearBranch: string): LifeTrendMatrix {
  const palaceTrends: DynamicPalaceDelta[][] = Array.from({ length: 12 }).map(() => Array(10).fill(null));
  const overallTrends: DynamicPalaceDelta[] = Array(10).fill(null);
  const labels: string[] = [];

  const decade = decades[selectedDecadeIndex];
  const ageStart = decade.range[0];
  const decStem = decade.heavenlyStem;
  const decBranch = decade.earthlyBranch;

  const bStemIdx = getStemIndex(birthYearStem);
  const bBranchIdx = getBranchIndex(birthYearBranch);

  const decLifeIdx = getBranchIndex(decBranch);
  const decOverlay = performOverlayRadar(basePalaces, '', '', decStem, decBranch, false);

  for (let i = 0; i < 10; i++) {
    const currentAge = ageStart + i;
    const offset = currentAge - 1;
    const yStem = STEMS[(bStemIdx + offset) % 10];
    const yBranch = BRANCHES[(bBranchIdx + offset) % 12];
    labels.push(`${currentAge}岁\n${yStem}${yBranch}年`);

    const yLifeIdx = getBranchIndex(yBranch);
    const yrOverlays = performOverlayRadar(basePalaces, decStem, decBranch, yStem, yBranch, true);

    let totalBase = 0, totalDomain = 0, totalAct = 0, totalOverlay = 0;

    for (let domainIdx = 0; domainIdx < 12; domainIdx++) {
      const targetPhysIdx = (yLifeIdx - domainIdx + 12) % 12;
      const physBranch = BRANCHES[targetPhysIdx]; 
      const physName = basePalaces.find((p:any)=>p.earthlyBranch === physBranch)?.name.replace('宫', '') + '宫';
      const targetPhysicalPalace = basePalaces.find((p:any) => p.earthlyBranch === physBranch);

      // 1. 继承原局与大限的底座
      const origScore = Number(baseScoresData.find((p: any) => p.earthlyBranch === physBranch)?.matrixScore ?? 0);
      const decDomainIdxForThisPhys = (decLifeIdx - targetPhysIdx + 12) % 12;
      const decDomainBonus = calculateDomainBonus(decDomainIdxForThisPhys, targetPhysicalPalace);
      const dOverlayScore = decOverlay.scores[targetPhysIdx];
      const yearlyBaseScore = origScore + decDomainBonus.score + dOverlayScore;

      // 2. 流年得位
      const domainResult = calculateDomainBonus(domainIdx, targetPhysicalPalace);

      // 3. 流年格局觉醒
      let aScore = 0; let aLogs: string[] = [];
      if ([0, 4, 6, 8].includes(domainIdx)) { 
        basePatterns.filter(p => p.palaceIndex === targetPhysIdx && !p.isAdvantage).forEach(p => {
          aScore += p.finalScore; aLogs.push(`✨ 【${p.patternName}】流年觉醒: ${p.finalScore > 0 ? '+' : ''}${p.finalScore}`);
        });
      }

      // 4. 流年大限共振 + 三盘究极共振
      let oScore = yrOverlays.scores[targetPhysIdx];
      let oLogs = [...yrOverlays.logs[targetPhysIdx]];

      // 🚀 V-Core 5D Vector Calculation (Yearly)
      const natalContext = mapToPalaceContext(targetPhysicalPalace);
      const oppPhysIdx = (targetPhysIdx + 6) % 12;
      const oppPhysicalPalace = basePalaces.find((p:any) => p.earthlyBranch === BRANCHES[oppPhysIdx]);
      const oppNatalContext = mapToPalaceContext(oppPhysicalPalace);
      
      const natalVector = VCoreEngine.calculatePalaceVector(natalContext, oppNatalContext);
      
      // Yearly context needs yearly mutagens
      const yLocs = getDynamicStarsLocations(yStem, yBranch);
      const yearlyMutagens: string[] = [];
      [...(targetPhysicalPalace.majorStars || []), ...(targetPhysicalPalace.minorStars || [])].forEach((s: any) => {
        const mutaIdx = yLocs.sihua.indexOf(s.name);
        if (mutaIdx !== -1) {
          yearlyMutagens.push(['禄', '权', '科', '忌'][mutaIdx]);
        }
      });

      const yearlyContext: PalaceContext = {
        ...natalContext,
        mutagens: yearlyMutagens,
      };

      const yearlyVector = VCoreEngine.calculatePalaceVector(yearlyContext, oppNatalContext);
      const { tDelta } = VCoreEngine.deduceTimeAxis(natalVector, natalContext, yearlyVector, yearlyContext);

      const tDeltaScore = Number((yearlyBaseScore + domainResult.score + aScore + oScore).toFixed(1));

      palaceTrends[domainIdx][i] = {
        domainName: `流年${DECADE_NAMES[domainIdx]}`,
        physicalPalace: physName,
        baseScore: Number(yearlyBaseScore.toFixed(1)),
        domainScore: Number(domainResult.score.toFixed(1)),
        domainLogs: domainResult.logs,
        activationScore: Number(aScore.toFixed(1)),
        activationLogs: aLogs,
        overlayScore: Number(oScore.toFixed(1)),
        overlayLogs: oLogs,
        totalDelta: tDeltaScore,
        vector5D: tDelta
      };
      totalBase += yearlyBaseScore; totalDomain += domainResult.score; totalAct += aScore; totalOverlay += oScore;
    }

    const overallOverlayLogs: string[] = [];
    for(let j=0; j<12; j++) {
        overallOverlayLogs.push(`[${DECADE_NAMES[j]}] 流年共振: ${palaceTrends[j][i].overlayScore > 0 ? '+' : ''}${palaceTrends[j][i].overlayScore}`);
    }

    overallTrends[i] = {
      domainName: "流年综合大盘 (十二宫总计)", physicalPalace: "全盘",
      baseScore: Number(totalBase.toFixed(1)), domainScore: Number(totalDomain.toFixed(1)), domainLogs: ["已包含流年各宫位得位加总。"],
      activationScore: Number(totalAct.toFixed(1)), activationLogs: ["已包含流年各潜伏格局的觉醒加总。"],
      overlayScore: Number(totalOverlay.toFixed(1)), overlayLogs: overallOverlayLogs,
      totalDelta: Number((totalBase + totalDomain + totalAct + totalOverlay).toFixed(1))
    };
  }

  return { palaceTrends, overallTrends, labels };
}
