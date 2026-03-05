// src/utils/nativeChartGenerator.ts
import { astro } from 'iztro';

// ✅ 使用本地类型定义，零风险
type Gender = '男' | '女';

export const generateNativeChart = (dateStr: string, timeStr: string | number, gender: string) => {
  console.log("🚀 开始排盘:", { dateStr, timeStr, gender }); // Debug日志

  try {
    // 1. 统一时间格式
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
    if (isNaN(date.getTime())) {
      console.error("❌ 日期格式无效");
      return null;
    }

    // 2. 调用核心算法 (v2)
    // 强制断言类型，确保 TS 编译通过且运行时安全
    const astrolabe = astro.bySolar(dateStr, timeIndex, gender as Gender, true, 'zh-CN');
    
    if (!astrolabe) {
      console.error("❌ iztro 排盘返回为空");
      return null;
    }

    // 3. 预演流年 (默认当前时间)
    const targetDate = new Date(); 
    const horoscope = astrolabe.horoscope(targetDate);

    // 4. 生成三代四化
    const sihuaData = {
      // @ts-ignore
      original: astrolabe.mutagens?.map(m => `${m.heavenlyStem}${m.star}化${m.mutagen}`) || [],
      // @ts-ignore
      decade: horoscope?.decadal?.mutagens?.map(m => `${m.heavenlyStem}${m.star}化${m.mutagen}`) || [],
      // @ts-ignore
      year: horoscope?.yearly?.mutagens?.map(m => `${m.heavenlyStem}${m.star}化${m.mutagen}`) || []
    };

    console.log("✅ 排盘成功，三代四化:", sihuaData);

    return {
      basicInfo: {
        "性别": astrolabe.gender,
        "阴历": astrolabe.lunarDate.toString(),
        "五行局": astrolabe.fiveElementsClass,
        "命主": astrolabe.soul,
        "身主": astrolabe.body
      },
      sihua: sihuaData, // 核心数据
      palaces: astrolabe.palaces.map((p, index) => {
        // 注入飞星
        const flyIn = [
          // @ts-ignore
          ...(horoscope?.decadal?.mutagens?.filter(m => m.palaceIndex === index).map(m => `[大限${m.mutagen}]${m.star}`) || []),
          // @ts-ignore
          ...(horoscope?.yearly?.mutagens?.filter(m => m.palaceIndex === index).map(m => `[流年${m.mutagen}]${m.star}`) || [])
        ];
        
        // 兼容旧 star 格式
        const stars = [
          ...p.majorStars.map(s => s.name + (s.mutagen ? `[${s.mutagen}]` : '')),
          ...p.minorStars.map(s => s.name),
          ...p.adjectiveStars.map(s => s.name)
        ];

        return {
          name: p.name,
          ganzhi: p.heavenlyStem + p.earthlyBranch,
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
    console.error("💥 排盘生成严重崩溃:", error);
    return null;
  }
};
