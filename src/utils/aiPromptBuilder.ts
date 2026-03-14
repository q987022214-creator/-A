
export interface DynamicContext {
  timeLabel: string; // 例如: "第三大限 (25-34岁)" 或 "2026年"
  ganZhi: string;    // 例如: "戊寅" 或 "丙午"
  sihua: string;     // 例如: "贪狼化禄, 太阴化权, 右弼化科, 天机化忌"
  jiSha?: string;    // 例如: "大限羊在午, 大限陀在辰"
  // 叠宫指针：告诉 AI 大运/流年的12个宫位分别落在了哪个地支上
  mapping: Record<string, string>; // 例如: { "大限命宫": "寅", "大限官禄": "戌", ... }
}

/**
 * 构建极致压缩、极低幻觉的 AI Prompt 数据包
 * @param iztroData 原局完整数据
 * @param decadeContext (可选) 大限的叠宫指针与四化
 * @param yearContext (可选) 流年的叠宫指针与四化
 */
export function buildAIPayload(iztroData: any, decadeContext?: DynamicContext, yearContext?: DynamicContext) {
  if (!iztroData || !iztroData.palaces) return null;

  const baseChart: Record<string, any> = {};

  // 1. 极致压缩原局底盘，以【地支】为绝对物理坐标
  iztroData.palaces.forEach((p: any) => {
    const branch = p.earthlyBranch;
    
    // 提取主星并附带亮度和原局四化
    const majorStars = p.majorStars ? p.majorStars.map((s: any) => 
      `${s.name}${s.brightness ? `(${s.brightness})` : ''}${s.mutagen ? `[化${s.mutagen}]` : ''}`
    ) : [];

    // 提取辅煞星并附带亮度和原局四化
    const minorStars = p.minorStars ? p.minorStars.map((s: any) => 
      `${s.name}${s.brightness ? `(${s.brightness})` : ''}${s.mutagen ? `[化${s.mutagen}]` : ''}`
    ) : [];

    // 组装单个宫位的纯净数据
    baseChart[branch] = {
      "原局宫位": p.name,
      "天干": p.heavenlyStem,
      "主星": majorStars.length > 0 ? majorStars.join(', ') : "无主星",
      "吉煞": minorStars.length > 0 ? minorStars.join(', ') : "无"
    };
  });

  // 2. 组装发给 AI 的终极 JSON
  const payload: any = {
    "system_instruction": "你是一位顶尖中州派紫微斗数大师。请严格使用【三盘叠影法】。大限与流年仅作为'引动指针'与'四化变数'，解盘时必须顺着指针回到【BaseChart_原局底盘】的地支坐标提取星曜，严禁张冠李戴产生幻觉。",
    "BaseChart_原局底盘": baseChart
  };

  // 3. 如果传入了大限，只挂载指针和变量，绝不重复发送全盘星曜
  if (decadeContext) {
    payload["Current_Decade_大限"] = decadeContext;
  }

  // 4. 如果传入了流年，同样只挂载指针
  if (yearContext) {
    payload["Current_Year_流年"] = yearContext;
  }

  return payload;
}
