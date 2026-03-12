
export interface PalaceScore {
  palaceName: string; 
  earthlyBranch: string; 
  heavenlyStem: string; 
  rawScore: number; // 本宫基础分
  comprehensiveScore: number; // 加权综合分 (核心排序依据)
  breakdowns: { starName: string; reason: string; score: number }[];
  starsStr: string; 
}

const STEM_SIHUA: Record<string, string[]> = {
  '甲': ['廉贞', '破军', '武曲', '太阳'],
  '乙': ['天机', '天梁', '紫微', '太阴'],
  '丙': ['天同', '天机', '文昌', '廉贞'],
  '丁': ['太阴', '天同', '天机', '巨门'],
  '戊': ['贪狼', '太阴', '右弼', '天机'],
  '己': ['武曲', '贪狼', '天梁', '文曲'],
  '庚': ['太阳', '武曲', '太阴', '天同'],
  '辛': ['巨门', '太阳', '文曲', '文昌'],
  '壬': ['天梁', '紫微', '左辅', '武曲'],
  '癸': ['破军', '巨门', '太阴', '贪狼'],
};

const SIHUA_NAMES = ['禄', '权', '科', '忌'];

export function calculatePalaceScores(iztroData: any): PalaceScore[] {
  if (!iztroData || !iztroData.palaces) return [];

  const palaces = iztroData.palaces;
  const rawScores: number[] = new Array(12).fill(0);
  const palaceResults: PalaceScore[] = [];

  // Step 1: Calculate rawScore for each palace
  for (let i = 0; i < 12; i++) {
    const palace = palaces[i];
    let score = 0;
    const breakdowns: { starName: string; reason: string; score: number }[] = [];
    
    const allStars = [
      ...(palace.majorStars || []),
      ...(palace.minorStars || []),
      ...(palace.adjectiveStars || [])
    ];

    const starNames = allStars.map((s: any) => s.name);
    const starsStr = starNames.join(' ');

    // Rule 1: Main Star Brightness
    (palace.majorStars || []).forEach((star: any) => {
      let brightnessScore = 0;
      const b = star.brightness;
      if (b === '庙') brightnessScore = 4;
      else if (b === '旺') brightnessScore = 3;
      else if (b === '得') brightnessScore = 2;
      else if (b === '平') brightnessScore = 1;
      else if (b === '陷') brightnessScore = -1;

      // Special cases for Sun/Moon
      if ((star.name === '太阳' || star.name === '太阴') && b === '庙') {
        brightnessScore = 5;
      }
      if (star.name === '太阳' && b === '陷') {
        brightnessScore = -2;
      }

      if (brightnessScore !== 0) {
        score += brightnessScore;
        breakdowns.push({ starName: star.name, reason: `亮度(${b})`, score: brightnessScore });
      }
    });

    // Rule 2: Auxiliary Stars
    const luckyStars = ['左辅', '右弼', '天魁', '天钺', '文昌', '文曲', '禄存'];
    const harmfulStars = ['擎羊', '陀罗', '火星', '铃星', '地空', '地劫'];

    allStars.forEach((star: any) => {
      if (luckyStars.includes(star.name)) {
        score += 2;
        breakdowns.push({ starName: star.name, reason: '吉星助益', score: 2 });
      } else if (harmfulStars.includes(star.name)) {
        const b = star.brightness;
        const harmfulScore = (b === '庙') ? -1 : -2;
        score += harmfulScore;
        breakdowns.push({ starName: star.name, reason: `煞星损耗(${b || '陷'})`, score: harmfulScore });
        
        // Special combos
        if ((star.name === '擎羊' || star.name === '陀罗') && (b === '庙' || b === '旺')) {
          if (starNames.includes('天同')) {
            score += 2;
            breakdowns.push({ starName: star.name, reason: '马头带箭/特殊格', score: 2 });
          }
        }
        if ((star.name === '火星' || star.name === '铃星') && (b === '庙' || b === '旺')) {
          if (starNames.includes('贪狼')) {
            score += 2;
            breakdowns.push({ starName: star.name, reason: '火贪/铃贪格', score: 2 });
          }
        }
      }
    });

    // Rule 3: Birth Year Sihua
    let hasLu = false;
    let hasJi = false;
    allStars.forEach((star: any) => {
      if (star.mutagen) {
        if (star.mutagen === '禄') {
          score += 4;
          hasLu = true;
          breakdowns.push({ starName: star.name, reason: '生年化禄', score: 4 });
        } else if (star.mutagen === '权') {
          score += 3;
          breakdowns.push({ starName: star.name, reason: '生年化权', score: 3 });
        } else if (star.mutagen === '科') {
          score += 2;
          breakdowns.push({ starName: star.name, reason: '生年化科', score: 2 });
        } else if (star.mutagen === '忌') {
          hasJi = true;
          let jiScore = -1;
          const pName = palace.name;
          if (['命宫', '财帛宫', '官禄宫', '田宅宫'].includes(pName)) jiScore = -1;
          else if (['交友宫', '夫妻宫', '子女宫'].includes(pName)) jiScore = -3;
          else jiScore = -1;
          
          score += jiScore;
          breakdowns.push({ starName: star.name, reason: `生年化忌(${pName})`, score: jiScore });
        }
      }
    });
    if (hasLu && hasJi) {
      score -= 4;
      breakdowns.push({ starName: '禄忌同宫', reason: '双忌效应/禄忌冲', score: -4 });
    }

    // Rule 4: Self-transformation (Zihua)
    const stem = palace.heavenlyStem;
    const transforms = STEM_SIHUA[stem] || [];
    
    // Centrifugal (本宫)
    transforms.forEach((starName, idx) => {
      if (starNames.includes(starName)) {
        const type = SIHUA_NAMES[idx];
        let zihuaScore = 0;
        if (type === '禄') zihuaScore = 1;
        else if (type === '权') zihuaScore = 1;
        else if (type === '科') zihuaScore = 0;
        else if (type === '忌') zihuaScore = -3;
        
        if (zihuaScore !== 0) {
          score += zihuaScore;
          breakdowns.push({ starName, reason: `离心自化${type}`, score: zihuaScore });
        }
      }
    });

    // Centripetal (对宫)
    const oppositeIndex = (i + 6) % 12;
    const oppositePalace = palaces[oppositeIndex];
    const oppositeStarNames = [
      ...(oppositePalace.majorStars || []),
      ...(oppositePalace.minorStars || []),
      ...(oppositePalace.adjectiveStars || [])
    ].map((s: any) => s.name);

    transforms.forEach((starName, idx) => {
      if (oppositeStarNames.includes(starName)) {
        const type = SIHUA_NAMES[idx];
        let xiangxinScore = 0;
        if (type === '禄') xiangxinScore = 3;
        else if (type === '权') xiangxinScore = 2;
        else if (type === '科') xiangxinScore = 2;
        else if (type === '忌') xiangxinScore = -1;
        
        if (xiangxinScore !== 0) {
          score += xiangxinScore;
          breakdowns.push({ starName, reason: `向心自化${type}`, score: xiangxinScore });
        }
      }
    });

    // Rule 5: Specific Palace Rules
    const pName = palace.name;
    if (pName === '财帛宫') {
      ['武曲', '太阴', '禄存'].forEach(s => {
        if (starNames.includes(s)) {
          score += 1;
          breakdowns.push({ starName: s, reason: '财星入财位', score: 1 });
        }
      });
      if (hasLu) {
        score += 1;
        breakdowns.push({ starName: '化禄', reason: '禄入财位', score: 1 });
      }
    }
    if (['夫妻宫', '兄弟宫', '交友宫', '父母宫'].includes(pName)) {
      ['七杀', '破军', '武曲', '巨门'].forEach(s => {
        if (starNames.includes(s)) {
          score -= 1;
          breakdowns.push({ starName: s, reason: '孤克星入六亲宫', score: -1 });
        }
      });
    }
    if (['财帛宫', '田宅宫'].includes(pName)) {
      ['地空', '地劫'].forEach(s => {
        if (starNames.includes(s)) {
          score -= 3;
          breakdowns.push({ starName: s, reason: '空劫入财田(大耗)', score: -3 });
        }
      });
    }

    rawScores[i] = score;
    palaceResults.push({
      palaceName: pName,
      earthlyBranch: palace.earthlyBranch,
      heavenlyStem: palace.heavenlyStem,
      rawScore: score,
      comprehensiveScore: 0, // Placeholder
      breakdowns,
      starsStr
    });
  }

  // Step 2: Calculate comprehensiveScore
  for (let i = 0; i < 12; i++) {
    const base = rawScores[i];
    const opposite = rawScores[(i + 6) % 12];
    const trine1 = rawScores[(i + 4) % 12];
    const trine2 = rawScores[(i + 8) % 12];

    const compScore = (base * 1.0) + (opposite * 0.8) + (trine1 * 0.6) + (trine2 * 0.6);
    palaceResults[i].comprehensiveScore = Math.round(compScore * 10) / 10;
  }

  return palaceResults;
}
