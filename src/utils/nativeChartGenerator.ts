// src/utils/nativeChartGenerator.ts
import { astro } from 'iztro';

// ✅ 使用本地类型定义，零风险
type Gender = '男' | '女';

export const generateNativeChart = (dateStr: string, timeStr: string | number, gender: string) => {
  console.log("🚀 开始排盘:", { dateStr, timeStr, gender });

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

    // 2. 校验日期
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      console.error("❌ 日期格式无效");
      return null;
    }

    // 3. 调用 iztro 核心算法
    // bySolar(日期, 时辰索引, 性别, 修正闰月, 语言)
    const astrolabe = astro.bySolar(dateStr, timeIndex, gender as Gender, true, 'zh-CN');
    
    if (!astrolabe) {
      console.error("❌ 排盘失败: astrolabe 为空");
      return null;
    }

    // 4. 生成流年数据 (默认以当前系统时间为准)
    const targetDate = new Date(); 
    const horoscope = astrolabe.horoscope(targetDate);

    // 5. 提取三代四化 (供 AI 使用)
    const sihuaData = {
      // @ts-ignore
      original: astrolabe.mutagens?.map(m => `${m.heavenlyStem}${m.star}化${m.mutagen}`) || [],
      // @ts-ignore
      decade: horoscope?.decadal?.mutagens?.map(m => `${m.heavenlyStem}${m.star}化${m.mutagen}`) || [],
      // @ts-ignore
      year: horoscope?.yearly?.mutagens?.map(m => `${m.heavenlyStem}${m.star}化${m.mutagen}`) || []
    };

    console.log("✅ 排盘成功，三代四化数据已生成");

    return {
      basicInfo: {
        "性别": astrolabe.gender,
        "阴历": astrolabe.lunarDate.toString(),
        "五行局": astrolabe.fiveElementsClass,
        "命主": astrolabe.soul,
        "身主": astrolabe.body
      },
      sihua: sihuaData, // 关键数据
      palaces: astrolabe.palaces.map((p, index) => {
        // 注入飞星：把大限和流年的四化飞星，塞进宫位里
        const flyIn = [
          // @ts-ignore
          ...(horoscope?.decadal?.mutagens?.filter(m => m.palaceIndex === index).map(m => `[大限${m.mutagen}]${m.star}`) || []),
          // @ts-ignore
          ...(horoscope?.yearly?.mutagens?.filter(m => m.palaceIndex === index).map(m => `[流年${m.mutagen}]${m.star}`) || [])
        ];
        
        // 【核心修复】：将星曜的亮度(brightness)和四化(mutagen)严格拼接到字符串中
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
          stars: stars,
          flyInMutagens: flyIn // AI 需要这个来判断吉凶
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
