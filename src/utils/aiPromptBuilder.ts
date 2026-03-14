// src/utils/aiPromptBuilder.ts

export interface DynamicContext {
  timeLabel: string; // 例如: "第三大限 (25-34岁)" 或 "2026年"
  ganZhi: string;    // 例如: "戊寅" 或 "丙午"
  sihua: string;     // 例如: "贪狼化禄, 太阴化权, 右弼化科, 天机化忌"
  jiSha?: string;    // 例如: "大限羊在午, 大限陀在辰"
  // 叠宫指针：告诉 AI 大运/流年的12个宫位分别落在了哪个原局地支上
  mapping: Record<string, string>; // 例如: { "大限命宫": "寅", "大限官禄": "戌", ... }
}

/**
 * 构建三盘叠影 AI Prompt 数据包
 * @param fullIztroData 完整不删减的原局数据 (保留神煞、杂曜等所有细节)
 * @param decadeContext (可选) 大限的叠宫指针与四化
 * @param yearContext (可选) 流年的叠宫指针与四化
 */
export function buildAIPayload(fullIztroData: any, decadeContext?: DynamicContext, yearContext?: DynamicContext) {
  if (!fullIztroData) return null;

  // 1. 组装发给 AI 的终极 JSON
  const payload: any = {
    "system_instruction": "你是一位顶尖的中州派与南派紫微斗数大师。请严格使用【三盘叠影法（叠宫法）】进行推断。大限与流年仅作为'引动指针'与'四化变数'。解盘时，你必须根据大限/流年落入的【地支坐标】，回到【BaseChart_原局底盘】中提取包含主星、吉煞、杂曜、神煞的全部完整信息，综合四化碰撞进行极度精准的推断，严禁脱离原局凭空捏造星曜。",
    
    // 🚀 宗师指示：原局必须满血保留所有细节！直接挂载完整排盘数据！
    "BaseChart_原局底盘": fullIztroData
  };

  // 2. 如果传入了大限，只挂载指针和变量
  if (decadeContext) {
    payload["Current_Decade_大限"] = decadeContext;
  }

  // 3. 如果传入了流年，同样只挂载指针
  if (yearContext) {
    payload["Current_Year_流年"] = yearContext;
  }

  return payload;
}
