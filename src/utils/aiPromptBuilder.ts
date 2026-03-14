// src/utils/aiPromptBuilder.ts

export interface DynamicContext {
  timeLabel: string; 
  ganZhi: string;    
  mapping: Record<string, string>; 
}

// 辅助：从原局中寻找某颗星曜落在哪个地支宫位
const findStarLoc = (starName: string, palaces: any[]) => {
  for (const p of palaces) {
    const allStars = [...(p.majorStars||[]), ...(p.minorStars||[]), ...(p.adjectiveStars||[])];
    if (allStars.some((s: any) => s.name === starName)) {
      return p.earthlyBranch + "宫";
    }
  }
  return "未知";
};

// 辅助：根据干支推算动态吉煞与四化
const getDynamicStars = (ganZhi: string) => {
  if (!ganZhi || ganZhi.length < 2) return null;
  const stem = ganZhi.charAt(0);
  const branch = ganZhi.charAt(1);

  const sihuaMap: Record<string, string[]> = {
      '甲': ['廉贞', '破军', '武曲', '太阳'], '乙': ['天机', '天梁', '紫微', '太阴'],
      '丙': ['天同', '天机', '文昌', '廉贞'], '丁': ['太阴', '天同', '天机', '巨门'],
      '戊': ['贪狼', '太阴', '右弼', '天机'], '己': ['武曲', '贪狼', '天梁', '文曲'],
      '庚': ['太阳', '武曲', '太阴', '天同'], '辛': ['巨门', '太阳', '文曲', '文昌'],
      '壬': ['天梁', '紫微', '左辅', '武曲'], '癸': ['破军', '巨门', '太阴', '贪狼']
  };
  const yangTuoMap: Record<string, string[]> = { 
      '甲': ['卯', '丑'], '乙': ['辰', '寅'], '丙': ['午', '辰'], '丁': ['未', '巳'], '戊': ['午', '辰'],
      '己': ['未', '巳'], '庚': ['酉', '未'], '辛': ['戌', '申'], '壬': ['子', '戌'], '癸': ['丑', '亥']
  };
  const kuiYueMap: Record<string, string[]> = {
      '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
      '乙': ['子', '申'], '己': ['子', '申'], '丙': ['亥', '酉'], '丁': ['亥', '酉'],
      '辛': ['午', '寅'], '壬': ['卯', '巳'], '癸': ['卯', '巳']
  };
  const maMap: Record<string, string> = {
      '寅': '申', '午': '申', '戌': '申', '申': '寅', '子': '寅', '辰': '寅',
      '巳': '亥', '酉': '亥', '丑': '亥', '亥': '巳', '卯': '巳', '未': '巳'
  };

  return {
      sihua: sihuaMap[stem] || [],
      yang: yangTuoMap[stem]?.[0] || '未知',
      tuo: yangTuoMap[stem]?.[1] || '未知',
      kui: kuiYueMap[stem]?.[0] || '未知',
      yue: kuiYueMap[stem]?.[1] || '未知',
      ma: maMap[branch] || '未知'
  };
};

/**
 * 构建极致压缩、0幻觉的三盘全息数据包
 */
export function buildAIPayload(fullIztroData: any, decadeContext?: DynamicContext, yearContext?: DynamicContext) {
  if (!fullIztroData || !fullIztroData.palaces) return null;

  // 1. 映射字典：为了把大限流年身份直接焊死在地支上
  const inverseDecade = decadeContext ? Object.fromEntries(Object.entries(decadeContext.mapping).map(([k, v]) => [v, k])) : {};
  const inverseYear = yearContext ? Object.fromEntries(Object.entries(yearContext.mapping).map(([k, v]) => [v, k])) : {};

  const baseChart: Record<string, any> = {};
  const info = fullIztroData.basicInfo || {};
  baseChart["基本信息"] = `${info.性别||''}, ${info.五行局||''}, 命主${info.命主||''}, 身主${info.身主||''}`;

  // 2. 榨干水分：重构原局 12 宫
  fullIztroData.palaces.forEach((p: any) => {
    const branch = p.earthlyBranch;
    
    // 扁平化星曜
    const allStars = [];
    if (p.majorStars) p.majorStars.forEach((s:any) => allStars.push(`${s.name}${s.brightness ? `(${s.brightness})` : ''}${s.mutagen ? `[化${s.mutagen}]` : ''}`));
    if (p.minorStars) p.minorStars.forEach((s:any) => allStars.push(`${s.name}${s.brightness ? `(${s.brightness})` : ''}${s.mutagen ? `[化${s.mutagen}]` : ''}`));
    if (p.adjectiveStars) p.adjectiveStars.forEach((s:any) => allStars.push(`${s.name}`));
    
    // 扁平化神煞
    const shensha = [];
    if (p.changsheng12) shensha.push(`${p.changsheng12}(长生)`);
    if (p.boshi12) shensha.push(`${p.boshi12}(博士)`);
    if (p.jiangqian12) shensha.push(`${p.jiangqian12}(将前)`);
    if (p.suiqian12) shensha.push(`${p.suiqian12}(岁前)`);

    // 动态组合重叠身份
    let identity = `【原局】${p.name}`;
    if (decadeContext && inverseDecade[branch]) identity += ` + 【大限】${inverseDecade[branch].replace('大限', '')}`;
    if (yearContext && inverseYear[branch]) identity += ` + 【流年】${inverseYear[branch].replace('流年', '')}`;

    baseChart[branch] = {
      "宫位身份": identity,
      "干支": `${p.heavenlyStem}${branch}`,
      "星曜": allStars.length > 0 ? allStars.join(', ') : "无主星(借对宫)",
      "神煞": shensha.join(', ')
    };
  });

  const payload: any = {
    "system_instruction": "你是一位顶尖的中州派与南派紫微斗数大师。请严格使用【三盘叠影法（叠宫法）】。我已在【BaseChart】中将原局、大限、流年的身份死死绑定在十二地支坐标上。请直接根据『宫位身份』提取星曜与神煞，并结合下方的『动态运限环境』进行推断，绝对禁止张冠李戴与编造幻觉！",
    "BaseChart_十二地支物理坐标": baseChart
  };

  // 3. 动态环境注入 (精准标出四化落点)
  if (decadeContext) {
    const dyn = getDynamicStars(decadeContext.ganZhi);
    if (dyn) {
      payload["Current_Decade_大限环境"] = {
        "时空": decadeContext.timeLabel,
        "干支": decadeContext.ganZhi,
        "四化引动": `${dyn.sihua[0]}化禄(在${findStarLoc(dyn.sihua[0], fullIztroData.palaces)}), ${dyn.sihua[1]}化权(在${findStarLoc(dyn.sihua[1], fullIztroData.palaces)}), ${dyn.sihua[2]}化科(在${findStarLoc(dyn.sihua[2], fullIztroData.palaces)}), ${dyn.sihua[3]}化忌(在${findStarLoc(dyn.sihua[3], fullIztroData.palaces)})`,
        "吉煞落点": `运羊(在${dyn.yang}宫), 运陀(在${dyn.tuo}宫), 运魁(在${dyn.kui}宫), 运钺(在${dyn.yue}宫)`
      };
    }
  }

  if (yearContext) {
    const dyn = getDynamicStars(yearContext.ganZhi);
    if (dyn) {
      payload["Current_Year_流年环境"] = {
        "时空": yearContext.timeLabel,
        "干支": yearContext.ganZhi,
        "四化引动": `${dyn.sihua[0]}化禄(在${findStarLoc(dyn.sihua[0], fullIztroData.palaces)}), ${dyn.sihua[1]}化权(在${findStarLoc(dyn.sihua[1], fullIztroData.palaces)}), ${dyn.sihua[2]}化科(在${findStarLoc(dyn.sihua[2], fullIztroData.palaces)}), ${dyn.sihua[3]}化忌(在${findStarLoc(dyn.sihua[3], fullIztroData.palaces)})`,
        "吉煞落点": `流羊(在${dyn.yang}宫), 流陀(在${dyn.tuo}宫), 流魁(在${dyn.kui}宫), 流钺(在${dyn.yue}宫), 流马(在${dyn.ma}宫)`
      };
    }
  }

  return payload;
}
