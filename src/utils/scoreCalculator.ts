
export interface ScoreBreakdown {
  starName: string;
  reason: string;
  score: number;
}

export interface FormulaStep {
  palaceRole: string; // "本宫", "对宫", "三合A", "三合B"
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
  rawScore: number; // 第一步：单宫纯净分
  finalScore: number; // 第二步：三方四正总分
  breakdowns: ScoreBreakdown[]; // 得分明细
  formula: FormulaStep[]; // 计算公式明细
  starsStr: string;
}

export function calculateChartScores(iztroData: any): PalaceScore[] {
  if (!iztroData || !iztroData.palaces) return [];

  const palaces = iztroData.palaces;
  const rawScores: number[] = new Array(12).fill(0);
  const palaceResults: PalaceScore[] = [];

  // --- 第一步：计算单宫纯净分 (Raw Score) ---
  for (let i = 0; i < 12; i++) {
    const palace = palaces[i];
    const pName = palace.name;
    const stars: string[] = palace.stars || []; // 例如 ["太阳(庙)[化忌]", "文昌(得)", "离心自化禄"]
    
    let score = 0;
    const breakdowns: ScoreBreakdown[] = [];
    
    // 辅助判定变量
    const starNames = stars.map(s => s.split(/[([]/)[0]);
    const hasStar = (name: string) => starNames.includes(name);
    const hasPattern = (pattern: string) => stars.some(s => s.includes(pattern));
    
    // 1. 主星亮度与辅曜吉凶解析
    stars.forEach(starStr => {
      const name = starStr.split(/[([]/)[0];
      
      // A. 主星亮度
      if (starStr.includes('(庙)')) {
        const bScore = (name === '太阳' || name === '太阴') ? 5 : 4;
        score += bScore;
        breakdowns.push({ starName: name, reason: '亮度(庙)', score: bScore });
      } else if (starStr.includes('(旺)')) {
        score += 3;
        breakdowns.push({ starName: name, reason: '亮度(旺)', score: 3 });
      } else if (starStr.includes('(得)')) {
        score += 2;
        breakdowns.push({ starName: name, reason: '亮度(得)', score: 2 });
      } else if (starStr.includes('(平)')) {
        score += 1;
        breakdowns.push({ starName: name, reason: '亮度(平)', score: 1 });
      } else if (starStr.includes('(陷)')) {
        const bScore = (name === '太阳') ? -2 : -1;
        score += bScore;
        breakdowns.push({ starName: name, reason: '亮度(陷)', score: bScore });
      }

      // B. 辅曜吉凶
      const luckyStars = ['左辅', '右弼', '天魁', '天钺', '文昌', '文曲', '禄存'];
      const harmfulStars = ['擎羊', '陀罗', '火星', '铃星', '地空', '地劫'];

      if (luckyStars.includes(name)) {
        score += 2;
        breakdowns.push({ starName: name, reason: '吉星助益', score: 2 });
      } else if (harmfulStars.includes(name)) {
        const hScore = starStr.includes('(庙)') ? -1 : -2;
        score += hScore;
        breakdowns.push({ starName: name, reason: '煞星损耗', score: hScore });
      }
    });

    // C. 组合加成
    // 擎羊/陀罗(庙旺) + 天同
    const hasYangTuoBright = stars.some(s => (s.includes('擎羊') || s.includes('陀罗')) && (s.includes('(庙)') || s.includes('(旺)')));
    if (hasYangTuoBright && hasStar('天同')) {
      score += 2;
      breakdowns.push({ starName: '天同格局', reason: '同阴羊陀/马头带箭类加成', score: 2 });
    }
    // 火星/铃星(庙旺) + 贪狼
    const hasHuoLingBright = stars.some(s => (s.includes('火星') || s.includes('铃星')) && (s.includes('(庙)') || s.includes('(旺)')));
    if (hasHuoLingBright && hasStar('贪狼')) {
      score += 2;
      breakdowns.push({ starName: '贪狼格局', reason: '火贪/铃贪格加成', score: 2 });
    }

    // 2. 生年四化解析
    let hasLu = false;
    let hasJi = false;

    stars.forEach(starStr => {
      const name = starStr.split(/[([]/)[0];
      if (starStr.includes('[化禄]')) {
        score += 4;
        hasLu = true;
        breakdowns.push({ starName: name, reason: '生年化禄', score: 4 });
      } else if (starStr.includes('[化权]')) {
        score += 3;
        breakdowns.push({ starName: name, reason: '生年化权', score: 3 });
      } else if (starStr.includes('[化科]')) {
        score += 2;
        breakdowns.push({ starName: name, reason: '生年化科', score: 2 });
      } else if (starStr.includes('[化忌]')) {
        hasJi = true;
        const jiScore = (['夫妻宫', '交友宫', '子女宫'].includes(pName)) ? -3 : -1;
        score += jiScore;
        breakdowns.push({ starName: name, reason: `生年化忌(${pName})`, score: jiScore });
      }
    });

    if (hasLu && hasJi) {
      score -= 4;
      breakdowns.push({ starName: '禄忌同宫', reason: '双忌效应/禄忌冲', score: -4 });
    }

    // 3. 自化解析
    stars.forEach(starStr => {
      if (starStr.includes('向心')) {
        if (starStr.includes('禄')) { score += 3; breakdowns.push({ starName: '向心自化', reason: '向心自化禄', score: 3 }); }
        else if (starStr.includes('权')) { score += 2; breakdowns.push({ starName: '向心自化', reason: '向心自化权', score: 2 }); }
        else if (starStr.includes('科')) { score += 2; breakdowns.push({ starName: '向心自化', reason: '向心自化科', score: 2 }); }
        else if (starStr.includes('忌')) { score -= 1; breakdowns.push({ starName: '向心自化', reason: '向心自化忌', score: -1 }); }
      } else if (starStr.includes('离心')) {
        if (starStr.includes('禄')) { score += 1; breakdowns.push({ starName: '离心自化', reason: '离心自化禄', score: 1 }); }
        else if (starStr.includes('权')) { score += 1; breakdowns.push({ starName: '离心自化', reason: '离心自化权', score: 1 }); }
        else if (starStr.includes('忌')) { score -= 3; breakdowns.push({ starName: '离心自化', reason: '离心自化忌', score: -3 }); }
      }
    });

    // 4. 得位失位特例
    if (pName === '财帛宫') {
      ['武曲', '太阴', '禄存'].forEach(n => {
        if (hasStar(n)) { score += 1; breakdowns.push({ starName: n, reason: '财星入财位', score: 1 }); }
      });
      if (hasPattern('[化禄]')) { score += 1; breakdowns.push({ starName: '化禄', reason: '禄入财位', score: 1 }); }
    }

    if (['夫妻宫', '兄弟宫', '交友宫', '父母宫'].includes(pName)) {
      ['七杀', '破军', '武曲', '巨门'].forEach(n => {
        if (hasStar(n)) { score -= 1; breakdowns.push({ starName: n, reason: '孤刚星入六亲宫', score: -1 }); }
      });
    }

    if (['财帛宫', '田宅宫'].includes(pName)) {
      ['地空', '地劫'].forEach(n => {
        if (hasStar(n)) { score -= 3; breakdowns.push({ starName: n, reason: '空劫入财田', score: -3 }); }
      });
    }

    rawScores[i] = score;
    palaceResults.push({
      index: i,
      palaceName: pName,
      earthlyBranch: palace.earthlyBranch || '',
      heavenlyStem: palace.heavenlyStem || '',
      rawScore: score,
      finalScore: 0,
      breakdowns,
      formula: [],
      starsStr: starNames.join(' ')
    });
  }

  // --- 第二步：计算最终排名总分 (Final Score) ---
  for (let i = 0; i < 12; i++) {
    const oppIdx = (i + 6) % 12;
    const trineAIdx = (i + 4) % 12;
    const trineBIdx = (i + 8) % 12;

    const steps: FormulaStep[] = [
      { palaceRole: '本宫', palaceName: palaceResults[i].palaceName, rawScore: rawScores[i], weight: 1.0, calculatedScore: rawScores[i] * 1.0 },
      { palaceRole: '对宫', palaceName: palaceResults[oppIdx].palaceName, rawScore: rawScores[oppIdx], weight: 0.5, calculatedScore: rawScores[oppIdx] * 0.5 },
      { palaceRole: '三合A', palaceName: palaceResults[trineAIdx].palaceName, rawScore: rawScores[trineAIdx], weight: 0.2, calculatedScore: rawScores[trineAIdx] * 0.2 },
      { palaceRole: '三合B', palaceName: palaceResults[trineBIdx].palaceName, rawScore: rawScores[trineBIdx], weight: 0.2, calculatedScore: rawScores[trineBIdx] * 0.2 }
    ];

    const finalScore = steps.reduce((sum, s) => sum + s.calculatedScore, 0);
    palaceResults[i].finalScore = Math.round(finalScore * 10) / 10;
    palaceResults[i].formula = steps;
  }

  return palaceResults.sort((a, b) => b.finalScore - a.finalScore);
}
