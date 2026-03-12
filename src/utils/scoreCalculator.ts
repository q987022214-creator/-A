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
  baseScore: number;       // 第一步：无衰减的本宫得分
  finalScore: number;      // 第二步：三方四正加权得分 (核心排序依据)
  baseBreakdowns: StarBreakdown[]; // 本宫得分明细
  formulaDetails: FormulaDetail[]; // 三方四正推演公式
  starsStr: string;
}

export function calculateChartScores(iztroData: any): PalaceScore[] {
  if (!iztroData || !iztroData.palaces) return [];
  const palaces = iztroData.palaces;
  const results: PalaceScore[] = [];

  // ==========================================
  // 第一步：独立计算十二宫各自的【本宫基础分】
  // ==========================================
  for (let i = 0; i < palaces.length; i++) {
    const p = palaces[i];
    const allStars: string[] = [...(p.stars || []), ...(p.flyInMutagens || [])];
    const pName = p.name || '';
    let baseScore = 0;
    const baseBreakdowns: StarBreakdown[] = [];
    const pureStarNames = allStars.map(s => s.replace(/[(\[【].*?[)\]】]/g, '')); // 提取纯星曜名用于组合判断

    allStars.forEach(starStr => {
      const starName = starStr.replace(/[(\[【].*?[)\]】]/g, '');

      // 1. 主星亮度赋分
      const majorStars = ["紫微","天机","太阳","武曲","天同","廉贞","天府","太阴","贪狼","巨门","天相","天梁","七杀","破军"];
      if (majorStars.includes(starName)) {
        if (starStr.includes('庙')) {
          const s = (starName === '太阳' || starName === '太阴') ? 5 : 4;
          baseScore += s; baseBreakdowns.push({ starName, reason: '亮度(庙)', score: s });
        } else if (starStr.includes('旺')) {
          baseScore += 3; baseBreakdowns.push({ starName, reason: '亮度(旺)', score: 3 });
        } else if (starStr.includes('得')) {
          baseScore += 2; baseBreakdowns.push({ starName, reason: '亮度(得)', score: 2 });
        } else if (starStr.includes('平')) {
          baseScore += 1; baseBreakdowns.push({ starName, reason: '亮度(平)', score: 1 });
        } else if (starStr.includes('陷')) {
          const s = (starName === '太阳') ? -2 : -1;
          baseScore += s; baseBreakdowns.push({ starName, reason: '亮度(陷)', score: s });
        }
      }

      // 2. 辅曜吉凶赋分
      const goodStars = ["左辅", "右弼", "天魁", "天钺", "文昌", "文曲", "禄存"];
      const badStars = ["擎羊", "陀罗", "火星", "铃星", "地空", "地劫"];
      if (goodStars.includes(starName)) {
        baseScore += 2; baseBreakdowns.push({ starName, reason: '吉星助益', score: 2 });
      }
      if (badStars.includes(starName)) {
        const s = starStr.includes('庙') ? -1 : -2;
        baseScore += s; baseBreakdowns.push({ starName, reason: starStr.includes('庙') ? '煞星(庙)减害' : '煞星损耗', score: s });
        // 煞星组合特例
        if ((starName === '擎羊' || starName === '陀罗') && (starStr.includes('庙') || starStr.includes('旺')) && pureStarNames.includes('天同')) {
          baseScore += 2; baseBreakdowns.push({ starName: `${starName}+天同`, reason: '特定吉化组合', score: 2 });
        }
        if ((starName === '火星' || starName === '铃星') && (starStr.includes('庙') || starStr.includes('旺')) && pureStarNames.includes('贪狼')) {
          baseScore += 2; baseBreakdowns.push({ starName: `${starName}+贪狼`, reason: '火贪/铃贪格', score: 2 });
        }
      }

      // 3. 四化赋分 (包含 生年与飞入)
      if (starStr.includes('化禄') || starStr.includes('禄]')) { baseScore += 4; baseBreakdowns.push({ starName, reason: '化禄', score: 4 }); }
      if (starStr.includes('化权') || starStr.includes('权]')) { baseScore += 3; baseBreakdowns.push({ starName, reason: '化权', score: 3 }); }
      if (starStr.includes('化科') || starStr.includes('科]')) { baseScore += 2; baseBreakdowns.push({ starName, reason: '化科', score: 2 }); }
      if (starStr.includes('化忌') || starStr.includes('忌]')) {
        let s = -1;
        if (['交友宫', '夫妻宫', '子女宫'].includes(pName)) s = -3;
        baseScore += s; baseBreakdowns.push({ starName, reason: '化忌', score: s });
      }

      // 4. 自化赋分
      if (starStr.includes('向心')) {
        if (starStr.includes('禄')) { baseScore += 3; baseBreakdowns.push({ starName, reason: '向心禄', score: 3 }); }
        if (starStr.includes('权')) { baseScore += 2; baseBreakdowns.push({ starName, reason: '向心权', score: 2 }); }
        if (starStr.includes('科')) { baseScore += 2; baseBreakdowns.push({ starName, reason: '向心科', score: 2 }); }
        if (starStr.includes('忌')) { baseScore -= 1; baseBreakdowns.push({ starName, reason: '向心忌', score: -1 }); }
      }
      if (starStr.includes('离心')) {
        if (starStr.includes('禄')) { baseScore += 1; baseBreakdowns.push({ starName, reason: '离心禄', score: 1 }); }
        if (starStr.includes('权')) { baseScore += 1; baseBreakdowns.push({ starName, reason: '离心权', score: 1 }); }
        if (starStr.includes('忌')) { baseScore -= 3; baseBreakdowns.push({ starName, reason: '离心忌', score: -3 }); }
      }

      // 5. 得位失位
      if (pName === '财帛宫' && (['武曲','太阴','禄存'].includes(starName) || starStr.includes('禄'))) {
        baseScore += 1; baseBreakdowns.push({ starName, reason: '星曜得位', score: 1 });
      }
      if (['夫妻宫','兄弟宫','交友宫','父母宫'].includes(pName) && ['七杀','破军','武曲','巨门'].includes(starName)) {
        baseScore -= 1; baseBreakdowns.push({ starName, reason: '星曜失位', score: -1 });
      }
      if (['财帛宫','田宅宫'].includes(pName) && ['地空','地劫'].includes(starName)) {
        baseScore -= 3; baseBreakdowns.push({ starName, reason: '空劫破库', score: -3 });
      }
    });

    // 禄忌同宫惩罚
    if (allStars.some(s => s.includes('禄')) && allStars.some(s => s.includes('忌'))) {
      baseScore -= 4; baseBreakdowns.push({ starName: '全局', reason: '禄忌同宫破格', score: -4 });
    }

    results.push({
      index: i,
      palaceName: pName,
      earthlyBranch: p.earthlyBranch || '',
      heavenlyStem: p.heavenlyStem || '',
      baseScore,
      finalScore: 0,
      baseBreakdowns,
      formulaDetails: [],
      starsStr: allStars.join(' ')
    });
  }

  // ==========================================
  // 第二步：执行三方四正衰减算法计算【最终得分】
  // ==========================================
  for (let i = 0; i < results.length; i++) {
    const cur = results[i];
    const opp = results[(i + 6) % 12];
    const trA = results[(i + 4) % 12];
    const trB = results[(i + 8) % 12];

    const cBase = cur.baseScore * 1.0;
    const cOpp = opp.baseScore * 0.5;
    const cTrA = trA.baseScore * 0.2;
    const cTrB = trB.baseScore * 0.2;

    cur.finalScore = cBase + cOpp + cTrA + cTrB;

    cur.formulaDetails = [
      { palaceRole: '本宫', palaceName: cur.palaceName, rawScore: cur.baseScore, weight: 1.0, calculatedScore: cBase },
      { palaceRole: '对宫', palaceName: opp.palaceName, rawScore: opp.baseScore, weight: 0.5, calculatedScore: cOpp },
      { palaceRole: '三合', palaceName: trA.palaceName, rawScore: trA.baseScore, weight: 0.2, calculatedScore: cTrA },
      { palaceRole: '三合', palaceName: trB.palaceName, rawScore: trB.baseScore, weight: 0.2, calculatedScore: cTrB },
    ];
  }

  return results.sort((a, b) => b.finalScore - a.finalScore);
}
