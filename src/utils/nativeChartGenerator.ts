// src/utils/nativeChartGenerator.ts
import { astro } from 'iztro';

type Gender = '男' | '女';

export const generateNativeChart = (dateStr: string, timeStr: string | number, gender: string) => {
  try {
    let timeIndex = 0;
    if (typeof timeStr === 'number') {
      timeIndex = timeStr;
    } else {
      const timeMap: Record<string, number> = { 
        '子时': 0, '丑时': 1, '寅时': 2, '卯时': 3, '辰时': 4, '巳时': 5, 
        '午时': 6, '未时': 7, '申时': 8, '酉时': 9, '戌时': 10, '亥时': 11 
      };
      timeIndex = timeMap[timeStr] !== undefined ? timeMap[timeStr] : 0;
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;

    const astrolabe = astro.bySolar(dateStr, timeIndex, gender as Gender, true, 'zh-CN');
    if (!astrolabe) return null;

    const targetDate = new Date(); 
    const horoscope = astrolabe.horoscope(targetDate);

    const sihuaData = {
      // @ts-ignore
      original: astrolabe.mutagens?.map(m => `${m.heavenlyStem}${m.star}化${m.mutagen}`) || [],
      // @ts-ignore
      decade: horoscope?.decadal?.mutagens?.map(m => `${m.heavenlyStem}${m.star}化${m.mutagen}`) || [],
      // @ts-ignore
      year: horoscope?.yearly?.mutagens?.map(m => `${m.heavenlyStem}${m.star}化${m.mutagen}`) || []
    };

    return {
      basicInfo: {
        "性别": astrolabe.gender,
        "阴历": astrolabe.lunarDate.toString(),
        "五行局": astrolabe.fiveElementsClass,
        "命主": astrolabe.soul,
        "身主": astrolabe.body
      },
      sihua: sihuaData, 
      palaces: astrolabe.palaces.map((p, index) => {
        const flyIn = [
          // @ts-ignore
          ...(horoscope?.decadal?.mutagens?.filter(m => m.palaceIndex === index).map(m => `[大限${m.mutagen}]${m.star}`) || []),
          // @ts-ignore
          ...(horoscope?.yearly?.mutagens?.filter(m => m.palaceIndex === index).map(m => `[流年${m.mutagen}]${m.star}`) || [])
        ];
        
        const stars = [
          ...p.majorStars.map((s: any) => `${s.name}${s.brightness ? `(${s.brightness})` : ''}${s.mutagen ? `[化${s.mutagen}]` : ''}`),
          ...p.minorStars.map((s: any) => `${s.name}${s.brightness ? `(${s.brightness})` : ''}`),
          ...p.adjectiveStars.map((s: any) => s.name)
        ];

        return {
          name: p.name,
          heavenlyStem: p.heavenlyStem,
          earthlyBranch: p.earthlyBranch,
          ganzhi: p.heavenlyStem + p.earthlyBranch,
          majorStars: p.majorStars,
          minorStars: p.minorStars,
          adjectiveStars: p.adjectiveStars,
          // 🚀 核心修复：补全十二神煞！
          changsheng12: p.changsheng12,
          boshi12: p.boshi12,
          jiangqian12: p.jiangqian12,
          suiqian12: p.suiqian12,
          stars: stars,
          flyInMutagens: flyIn
        };
      }),
      rawParams: {
        birthday: dateStr,
        birthTime: timeIndex,
        gender: gender,
        birthdayType: 'solar'
      }
    };
  } catch (error) {
    return null;
  }
};
