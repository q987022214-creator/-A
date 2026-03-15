// src/utils/nativeChartGenerator.ts
import { astro } from 'iztro';

type Gender = '男' | '女';

export interface NativeChartOptions {
  name?: string;
  calendarType: 'solar' | 'lunar';
  dateStr: string; // YYYY-MM-DD
  timeIndex: number; // 0-11
  gender: string;
  isLeapMonth?: boolean;
}

export const generateNativeChart = (options: NativeChartOptions) => {
  try {
    const { calendarType, dateStr, timeIndex, gender, isLeapMonth } = options;
    
    let astrolabe;
    if (calendarType === 'lunar') {
      astrolabe = astro.byLunar(dateStr, timeIndex, gender as Gender, isLeapMonth, true, 'zh-CN');
    } else {
      astrolabe = astro.bySolar(dateStr, timeIndex, gender as Gender, true, 'zh-CN');
    }
    
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
        "姓名": options.name || '匿名',
        "性别": astrolabe.gender,
        "阴历": astrolabe.lunarDate.toString(),
        "阳历": astrolabe.solarDate,
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
          changsheng12: p.changsheng12,
          boshi12: p.boshi12,
          jiangqian12: p.jiangqian12,
          suiqian12: p.suiqian12,
          stars: stars,
          flyInMutagens: flyIn
        };
      }),
      rawParams: {
        name: options.name,
        birthday: dateStr,
        birthTime: timeIndex,
        gender: gender,
        birthdayType: calendarType,
        isLeapMonth: isLeapMonth
      }
    };
  } catch (error) {
    return null;
  }
};
