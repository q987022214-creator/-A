import { astro } from 'iztro';

export function generateNativeChart(solarDateStr: string, timeStr: string, gender: string) {
  try {
    const timeMap: Record<string, number> = { '子时': 0, '丑时': 1, '寅时': 2, '卯时': 3, '辰时': 4, '巳时': 5, '午时': 6, '未时': 7, '申时': 8, '酉时': 9, '戌时': 10, '亥时': 11 };
    const timeIndex = timeMap[timeStr] !== undefined ? timeMap[timeStr] : 0;
    const astrolabe = astro.bySolar(solarDateStr, timeIndex, gender as '男' | '女', true, 'zh-CN');

    const result: any = {
      basicInfo: {
        "性别": astrolabe.gender,
        "阴历": astrolabe.lunarDate,
        "五行局": astrolabe.fiveElementsClass,
        "命主": astrolabe.soul,
        "身主": astrolabe.body
      },
      palaces: [],
      timeline: [],
      rawParams: {
        birthday: solarDateStr,
        birthTime: timeIndex,
        gender: gender,
        birthdayType: 'solar'
      }
    };
    
    // 1. 紫微斗数十干四化标准字典
    const SIHUA_MAP: Record<string, string> = {
      '甲': '廉贞禄,破军权,武曲科,太阳忌', '乙': '天机禄,天梁权,紫微科,太阴忌',
      '丙': '天同禄,天机权,文昌科,廉贞忌', '丁': '太阴禄,天同权,天机科,巨门忌',
      '戊': '贪狼禄,太阴权,右弼科,天机忌', '己': '武曲禄,贪狼权,天梁科,文曲忌',
      '庚': '太阳禄,武曲权,太阴科,天同忌', '辛': '巨门禄,太阳权,文曲科,文昌忌',
      '壬': '天梁禄,紫微权,左辅科,武曲忌', '癸': '破军禄,巨门权,太阴科,贪狼忌'
    };
    
    // 2. 干支日历推算器 (根据公历年份极速计算天干地支)
    const getGanzhi = (year: number) => {
      const stems = ['癸', '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬'];
      const branches = ['申', '酉', '戌', '亥', '子', '丑', '寅', '卯', '辰', '巳', '午', '未'];
      return stems[year % 10] + branches[year % 12];
    };
    
    // 3. 确定农历基准年份 (解决春节前出生跨年问题)
    const birthGanzhi = astrolabe.lunarDate.substring(0, 2);
    let baseYear = parseInt(solarDateStr.split('-')[0]);
    if (getGanzhi(baseYear) !== birthGanzhi) {
       baseYear -= 1; // 修正岁数等于1的那年
    }
    
    // 4. 提取十二原局宫位
    astrolabe.palaces.forEach(p => {
      const stars: string[] = [];
      p.majorStars.forEach(s => stars.push(s.name + (s.mutagen ? `[${s.mutagen}]` : '')));
      p.minorStars.forEach(s => stars.push(s.name));
      p.adjectiveStars.forEach(s => stars.push(s.name));
      result.palaces.push({
        name: p.name,
        ganzhi: p.heavenlyStem + p.earthlyBranch,
        stars: stars
      });
    });
    
    // 5. 满血复原大限与流年数组 (高密度版)
    astrolabe.palaces.forEach(p => {
      if (!p.decadal) return;
      
      const startAge = p.decadal.range[0];
      const endAge = p.decadal.range[1];
      const startYear = baseYear + startAge - 1;
      const endYear = baseYear + endAge - 1;
      
      const decadeObj: any = {
        decadeName: `第${Math.floor(startAge/10) + 1}大限`,
        ganzhi: p.heavenlyStem + p.earthlyBranch,
        ageRange: `${startYear}年(${startAge}岁)~${endYear}年(${endAge}岁)`,
        sihua: SIHUA_MAP[p.heavenlyStem] || "",
        years: []
      };
      
      // 遍历该大限内的10个流年
      for (let age = startAge; age <= endAge; age++) {
        const year = baseYear + age - 1;
        const yearGanzhi = getGanzhi(year);
        const stem = yearGanzhi.charAt(0);
        const branch = yearGanzhi.charAt(1);
        
        const ySihua = SIHUA_MAP[stem] || "";
        // 根据紫微排盘规则：流年命宫等于流年地支所在的宫位
        const yPalace = result.palaces.find((pal: any) => pal.ganzhi.includes(branch))?.ganzhi || branch;
        decadeObj.years.push(`${year}|${yearGanzhi}|${age}岁|命:${yPalace}|化:${ySihua}`);
      }
      
      result.timeline.push(decadeObj);
    });
    
    // 6. 按起步岁数排序
    result.timeline.sort((a: any, b: any) => parseInt(a.ageRange.match(/\d+/)[0]) - parseInt(b.ageRange.match(/\d+/)[0]));
    
    return result;
  } catch (error) {
    console.error("排盘失败:", error);
    return null;
  }
}
