import { PatternResult } from './patternRecognizer'; 

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
  patternScore: number;      
  matrixScore: number;       
  finalScore: number;        
  baseBreakdowns: StarBreakdown[]; 
  patternBreakdowns: StarBreakdown[]; 
  formulaDetails: FormulaDetail[]; 
  starsStr: string;
}

// 十干四化诀 (绝对物理隔离，专门用于算自化，绝不信任流年飞星)
export const STEM_MUTAGENS: Record<string, { star: string, mutagen: string }[]> = {
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

export const SCORE_RULES = {
  majorStars: ["紫微", "天机", "太阳", "武曲", "天同", "廉贞", "天府", "太阴", "贪狼", "巨门", "天相", "天梁", "七杀", "破军"],
  goodMinor: ["左辅", "右弼", "天魁", "天钺", "文昌", "文曲", "禄存", "天马"],
  badMinor: ["擎羊", "陀罗", "火星", "铃星", "地空", "地劫"],
  
  goodPairs: [['左辅', '右弼'], ['天魁', '天钺'], ['文昌', '文曲'], ['禄存', '天马']],
  badPairs: [['擎羊', '陀罗'], ['火星', '铃星'], ['地空', '地劫']],

  brightnessBase: {
    major: { miao: 3, wang: 2, de: 1, ping: 0, xian: -3 }, 
    // 🟢 最新亮度浮动：庙旺+1，得平+0，陷-1 (没有亮度的星不加减)
    minorModifier: { miaoWang: 1, dePing: 0, xian: -1 } 
  },
  
  sihua: {
    '禄': 10, '权': 7, '科': 3,
    '忌': { selfPalaces: ['命宫', '财帛宫', '官禄宫', '田宅宫', '疾厄宫', '福德宫'], selfScore: -3, otherScore: -5 }
  },
  ziHua: {
    inward: { '禄': 7, '权': 5, '科': 3, '忌': -3 }, 
    outward: { '禄': 3, '权': 2, '科': 0, '忌': -5 } 
  },
  
  weights: {
    normal: { base: 1.0, opp: 0.7, trA: 0.25, trB: 0.25 },
    empty: { base: 1.0, opp: 0.7, trA: 0.25, trB: 0.25, oppTrA: 0.15, oppTrB: 0.15 }
  }
};

export function calculateChartScores(iztroData: any, patterns: PatternResult[] = []): PalaceScore[] {
  if (!iztroData || !iztroData.palaces) return [];
  const palaces = iztroData.palaces;
  const results: PalaceScore[] = [];

  // 第一步：清洗数据，绝对剔除流年大限的临时飞星
  const parsedPalaces = palaces.map((p: any) => {
    const starFeatures: { name: string, brightness: string, mutagens: string[] }[] = [];
    let hasMajor = false;
    
    if (p.majorStars) {
      p.majorStars.forEach((s: any) => {
        starFeatures.push({ name: s.name, brightness: s.brightness || '', mutagens: s.mutagen ? [s.mutagen] : [] });
        if (SCORE_RULES.majorStars.includes(s.name)) hasMajor = true;
      });
    }
    if (p.minorStars) {
      p.minorStars.forEach((s: any) => starFeatures.push({ name: s.name, brightness: s.brightness || '', mutagens: s.mutagen ? [s.mutagen] : [] }));
    }
    
    const pNameRaw = p.name || '';
    const pName = pNameRaw.endsWith('宫') ? pNameRaw : pNameRaw + '宫';

    return { name: pName, earthlyBranch: p.earthlyBranch, heavenlyStem: p.heavenlyStem, stars: starFeatures, isEmpty: !hasMajor };
  });

  // 第二步：独立结算星曜基础算力
  for (let i = 0; i < parsedPalaces.length; i++) {
    const pData = parsedPalaces[i];
    const oppData = parsedPalaces[(i + 6) % 12];
    const trAData = parsedPalaces[(i + 4) % 12];
    const trBData = parsedPalaces[(i + 8) % 12];

    const pName = pData.name;
    let baseScore = 0;
    const baseBreakdowns: StarBreakdown[] = [];
    
    const palaceStarNames = pData.stars.map(s => s.name);
    // 提取三方四正其他三个宫位的星曜，用于判定“三方成对”
    const restSFStarNames = [
      ...oppData.stars.map(s => s.name),
      ...trAData.stars.map(s => s.name),
      ...trBData.stars.map(s => s.name)
    ];
    
    let hasShengNianLu = false; let hasShengNianJi = false;
    let hasZiHuaLu = false; let hasZiHuaJi = false;
    let jiEBadCount = 0;

    // 🛡️ 十干引擎：亲自推算真正的离心/向心自化
    const myStem = pData.heavenlyStem;
    const oppStem = parsedPalaces[(i+6)%12].heavenlyStem;
    const myTransforms = STEM_MUTAGENS[myStem] || [];
    const oppTransforms = STEM_MUTAGENS[oppStem] || [];

    myTransforms.forEach(t => {
      if (palaceStarNames.includes(t.star)) {
        const score = SCORE_RULES.ziHua.outward[t.mutagen as keyof typeof SCORE_RULES.ziHua.outward];
        if (score !== 0) { baseScore += score; baseBreakdowns.push({ starName: t.star, reason: `离心化${t.mutagen}`, score }); }
        if (t.mutagen === '禄') hasZiHuaLu = true;
        if (t.mutagen === '忌') { hasZiHuaJi = true; if(pName==='疾厄宫') jiEBadCount++; }
      }
    });

    oppTransforms.forEach(t => {
      if (palaceStarNames.includes(t.star)) {
        const score = SCORE_RULES.ziHua.inward[t.mutagen as keyof typeof SCORE_RULES.ziHua.inward];
        if (score !== 0) { baseScore += score; baseBreakdowns.push({ starName: t.star, reason: `向心化${t.mutagen}`, score }); }
        if (t.mutagen === '禄') hasZiHuaLu = true;
        if (t.mutagen === '忌') { hasZiHuaJi = true; if(pName==='疾厄宫') jiEBadCount++; }
      }
    });

    pData.stars.forEach(star => {
      const isMiaoWang = ['庙', '旺'].includes(star.brightness);
      const isDePing = ['得', '平', '利'].includes(star.brightness);
      const isXian = ['陷', '不'].includes(star.brightness);
      const brightLabel = star.brightness || '无';

      // 1. 主星赋分
      if (SCORE_RULES.majorStars.includes(star.name)) {
        let s = 0;
        if (star.brightness === '庙') s = (star.name === '太阳' || star.name === '太阴') ? 4 : SCORE_RULES.brightnessBase.major.miao;
        else if (star.brightness === '旺') s = SCORE_RULES.brightnessBase.major.wang;
        else if (star.brightness === '得') s = SCORE_RULES.brightnessBase.major.de;
        else if (['平', '利'].includes(star.brightness)) s = SCORE_RULES.brightnessBase.major.ping;
        else if (isXian) s = (star.name === '太阳') ? -4 : SCORE_RULES.brightnessBase.major.xian;
        if (s !== 0) { baseScore += s; baseBreakdowns.push({ starName: star.name, reason: `主星(${brightLabel})`, score: s }); }
      }

      // 2. 🌟 吉星空间动态赋分
      if (SCORE_RULES.goodMinor.includes(star.name)) {
        let isSamePalace = false;
        let isSanFang = false;
        SCORE_RULES.goodPairs.forEach(pair => {
            if (pair.includes(star.name)) {
                const partner = pair[0] === star.name ? pair[1] : pair[0];
                if (palaceStarNames.includes(partner)) isSamePalace = true;
                else if (restSFStarNames.includes(partner)) isSanFang = true;
            }
        });
        
        let baseS = isSamePalace ? 6 : (isSanFang ? 4 : 2); 
        let modifier = 0; // 默认无亮度为 0
        if (isMiaoWang) modifier = SCORE_RULES.brightnessBase.minorModifier.miaoWang;
        else if (isDePing) modifier = SCORE_RULES.brightnessBase.minorModifier.dePing;
        else if (isXian) modifier = SCORE_RULES.brightnessBase.minorModifier.xian;
        
        const totalScore = baseS + modifier;
        if (totalScore !== 0) { 
            baseScore += totalScore; 
            const pairText = isSamePalace ? '同宫成对' : (isSanFang ? '三方成对' : '单见');
            baseBreakdowns.push({ starName: star.name, reason: `吉星${pairText}(${brightLabel})`, score: totalScore }); 
        }
      }

      // 3. 💥 煞星空间动态赋分
      if (SCORE_RULES.badMinor.includes(star.name)) {
        if (pName === '福德宫' && ['地空', '地劫'].includes(star.name)) {
          baseBreakdowns.push({ starName: star.name, reason: `福德遇空劫(免扣)`, score: 0 });
        } else {
          let isSamePalace = false;
          let isSanFang = false;
          SCORE_RULES.badPairs.forEach(pair => {
              if (pair.includes(star.name)) {
                  const partner = pair[0] === star.name ? pair[1] : pair[0];
                  if (palaceStarNames.includes(partner)) isSamePalace = true;
                  else if (restSFStarNames.includes(partner)) isSanFang = true;
              }
          });
          
          let baseS = isSamePalace ? -6 : (isSanFang ? -4 : -2); 
          let modifier = 0;
          if (isMiaoWang) modifier = SCORE_RULES.brightnessBase.minorModifier.miaoWang;
          else if (isDePing) modifier = SCORE_RULES.brightnessBase.minorModifier.dePing;
          else if (isXian) modifier = SCORE_RULES.brightnessBase.minorModifier.xian;
          
          const totalScore = baseS + modifier;
          if (totalScore !== 0) { 
              baseScore += totalScore; 
              const pairText = isSamePalace ? '同宫成对' : (isSanFang ? '三方成对' : '单见');
              baseBreakdowns.push({ starName: star.name, reason: `煞星${pairText}(${brightLabel})`, score: totalScore }); 
          }
        }
      }

      // 4. 生年四化 (此时已绝对安全)
      star.mutagens.forEach(m => {
          if (m.includes('禄')) { baseScore += SCORE_RULES.sihua['禄']; baseBreakdowns.push({ starName: star.name||'四化', reason: '生年化禄', score: SCORE_RULES.sihua['禄'] }); hasShengNianLu = true; }
          if (m.includes('权')) { baseScore += SCORE_RULES.sihua['权']; baseBreakdowns.push({ starName: star.name||'四化', reason: '生年化权', score: SCORE_RULES.sihua['权'] }); }
          if (m.includes('科')) { baseScore += SCORE_RULES.sihua['科']; baseBreakdowns.push({ starName: star.name||'四化', reason: '生年化科', score: SCORE_RULES.sihua['科'] }); }
          if (m.includes('忌')) {
            hasShengNianJi = true; if (pName === '疾厄宫') jiEBadCount++;
            const s = SCORE_RULES.sihua['忌'].selfPalaces.includes(pName) ? SCORE_RULES.sihua['忌'].selfScore : SCORE_RULES.sihua['忌'].otherScore;
            baseScore += s; baseBreakdowns.push({ starName: star.name||'四化', reason: `生年化忌(${s===-3?'我宫':'他宫'})`, score: s });
          }
      });

      // 5. 特定宫位得失位
      if (pName === '财帛宫') {
        if (['武曲', '太阴'].includes(star.name)) { baseScore += 2; baseBreakdowns.push({ starName: star.name, reason: '财宫见武/阴', score: 2 }); }
        if (['禄存', '化禄'].includes(star.name) || star.mutagens.some(m => m.includes('禄'))) { baseScore += 3; baseBreakdowns.push({ starName: star.name, reason: '财宫见禄星', score: 3 }); }
        if (star.name === '太阳') { baseScore -= 1; baseBreakdowns.push({ starName: star.name, reason: '财宫遇太阳', score: -1 }); }
        if (['地空', '地劫'].includes(star.name)) { baseScore -= 2; baseBreakdowns.push({ starName: star.name, reason: '财宫空劫', score: -2 }); }
      }
      if (['夫妻宫', '子女宫', '兄弟宫', '交友宫', '父母宫'].includes(pName)) {
        if (['七杀', '破军', '武曲', '巨门'].includes(star.name)) { baseScore -= 2; baseBreakdowns.push({ starName: star.name, reason: '六亲遇耗星', score: -2 }); }
      }
      if (pName === '田宅宫') {
        if (['天府', '太阴', '禄存'].includes(star.name)) { baseScore += 2; baseBreakdowns.push({ starName: star.name, reason: '田宅得库', score: 2 }); }
        if (['破军'].includes(star.name)) { baseScore -= 1; baseBreakdowns.push({ starName: star.name, reason: '田宅破耗', score: -1 }); }
        if (['地空', '地劫'].includes(star.name)) { baseScore -= 2; baseBreakdowns.push({ starName: star.name, reason: '田宅空劫', score: -2 }); }
      }
      if (['官禄宫', '迁移宫'].includes(pName)) {
        if (star.name === '太阳' && isMiaoWang) { baseScore += 2; baseBreakdowns.push({ starName: star.name, reason: '动宫见阳(庙旺)', score: 2 }); }
        if (star.mutagens.some(m => m.includes('忌'))) { baseScore -= 2; baseBreakdowns.push({ starName: star.name, reason: '动宫遇忌', score: -2 }); }
      }
      if (pName === '疾厄宫' && ['擎羊', '天刑'].includes(star.name)) { jiEBadCount++; }
      if (pName === '福德宫') {
        if (['天同', '太阴'].includes(star.name) && isMiaoWang) { baseScore += 1; baseBreakdowns.push({ starName: star.name, reason: '福德见吉(庙旺)', score: 1 }); }
        if (star.mutagens.some(m => m.includes('忌'))) { baseScore -= 2; baseBreakdowns.push({ starName: star.name, reason: '福德遇忌', score: -2 }); }
      }
    });

    if (pName === '疾厄宫' && jiEBadCount >= 2) { baseScore -= 2; baseBreakdowns.push({ starName: '全局', reason: '疾厄煞忌交集(≥2)', score: -2 }); }
    
    if (hasShengNianLu && hasShengNianJi) { baseScore -= 8; baseBreakdowns.push({ starName: '全局', reason: '生年禄忌同宫(双忌冲破)', score: -8 }); }
    else if (hasShengNianLu && hasZiHuaJi) { baseScore -= 4; baseBreakdowns.push({ starName: '全局', reason: '生年禄遇自化忌(禄出)', score: -4 }); }
    else if (hasShengNianJi && hasZiHuaLu) { baseScore -= 2; baseBreakdowns.push({ starName: '全局', reason: '生年忌遇自化禄', score: -2 }); }
    else if (hasZiHuaLu && hasZiHuaJi) { baseScore -= 1; baseBreakdowns.push({ starName: '全局', reason: '自化禄忌同宫', score: -1 }); }

    // 第三步：物理隔离存储格局分
    let pScore = 0;
    const pBreakdowns: StarBreakdown[] = [];
    const palacePatterns = patterns.filter(pat => pat.palaceIndex === i);
    palacePatterns.forEach(pattern => {
      pScore += pattern.finalScore;
      pBreakdowns.push({
        starName: '🌟核心格局',
        reason: pattern.patternName.split(' ')[0], 
        score: pattern.finalScore
      });
    });

    results.push({
      index: i,
      palaceName: pName, 
      earthlyBranch: pData.earthlyBranch || '',
      heavenlyStem: pData.heavenlyStem || '',
      baseScore,
      originalBaseScore: 0,
      patternScore: pScore,
      matrixScore: 0,
      finalScore: 0,
      baseBreakdowns,
      patternBreakdowns: pBreakdowns,
      formulaDetails: [],
      starsStr: pData.stars.map(s => s.name).join(' ')
    });
  }

  // 借魂重构
  for (let i = 0; i < 12; i++) {
    results[i].originalBaseScore = results[i].baseScore;
  }

  for (let i = 0; i < 12; i++) {
    if (parsedPalaces[i].isEmpty) {
      const opp = results[(i + 6) % 12];
      const borrowedMajorScore = opp.baseBreakdowns
        .filter(b => SCORE_RULES.majorStars.includes(b.starName))
        .reduce((sum, b) => sum + b.score, 0);

      const soulScore = borrowedMajorScore * 0.8;
      results[i].baseScore += soulScore;
      results[i].baseBreakdowns.push({ starName: '借星安宫', reason: '对宫主星及四化(80%)', score: soulScore });
    }
  }

  // 矩阵融合
  for (let i = 0; i < 12; i++) {
    const cur = results[i];
    const opp = results[(i + 6) % 12];
    const trA = results[(i + 4) % 12];
    const trB = results[(i + 8) % 12];

    if (parsedPalaces[i].isEmpty) {
      const oppTrA = results[(i + 6 + 4) % 12];
      const oppTrB = results[(i + 6 + 8) % 12];
      const w = SCORE_RULES.weights.empty;

      cur.matrixScore = (cur.baseScore * w.base) + (opp.originalBaseScore * w.opp) + (trA.originalBaseScore * w.trA) + (trB.originalBaseScore * w.trB) + (oppTrA.originalBaseScore * w.oppTrA) + (oppTrB.originalBaseScore * w.oppTrB);
      
      cur.formulaDetails = [
        { palaceRole: '本宫(空)', palaceName: cur.palaceName, rawScore: cur.baseScore, weight: w.base, calculatedScore: cur.baseScore * w.base },
        { palaceRole: '对宫', palaceName: opp.palaceName, rawScore: opp.originalBaseScore, weight: w.opp, calculatedScore: opp.originalBaseScore * w.opp },
        { palaceRole: '三合A', palaceName: trA.palaceName, rawScore: trA.originalBaseScore, weight: w.trA, calculatedScore: trA.originalBaseScore * w.trA },
        { palaceRole: '三合B', palaceName: trB.palaceName, rawScore: trB.originalBaseScore, weight: w.trB, calculatedScore: trB.originalBaseScore * w.trB },
        { palaceRole: '对宫三合A', palaceName: oppTrA.palaceName, rawScore: oppTrA.originalBaseScore, weight: w.oppTrA, calculatedScore: oppTrA.originalBaseScore * w.oppTrA },
        { palaceRole: '对宫三合B', palaceName: oppTrB.palaceName, rawScore: oppTrB.originalBaseScore, weight: w.oppTrB, calculatedScore: oppTrB.originalBaseScore * w.oppTrB },
      ];
    } else {
      const w = SCORE_RULES.weights.normal;
      cur.matrixScore = (cur.baseScore * w.base) + (opp.originalBaseScore * w.opp) + (trA.originalBaseScore * w.trA) + (trB.originalBaseScore * w.trB);
      
      cur.formulaDetails = [
        { palaceRole: '本宫', palaceName: cur.palaceName, rawScore: cur.baseScore, weight: w.base, calculatedScore: cur.baseScore * w.base },
        { palaceRole: '对宫', palaceName: opp.palaceName, rawScore: opp.originalBaseScore, weight: w.opp, calculatedScore: opp.originalBaseScore * w.opp },
        { palaceRole: '三合A', palaceName: trA.palaceName, rawScore: trA.originalBaseScore, weight: w.trA, calculatedScore: trA.originalBaseScore * w.trA },
        { palaceRole: '三合B', palaceName: trB.palaceName, rawScore: trB.originalBaseScore, weight: w.trB, calculatedScore: trB.originalBaseScore * w.trB },
      ];
    }
    
    // 最终战力 = 纯净矩阵 + 高维格局
    cur.finalScore = cur.matrixScore + cur.patternScore;
  }

  return results.sort((a, b) => b.finalScore - a.finalScore);
}
