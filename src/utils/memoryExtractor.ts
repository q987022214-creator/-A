export const extractAndSaveMemory = async (chartId: string, userText: string, aiText: string) => {
  // 【深水炸弹 1】只要函数被调用，必须弹窗证明自己活着！
  alert("🚀 记忆提炼引擎已触发！正在思考中...");
  
  try {
    const settingsStr = localStorage.getItem('ziwei_api_settings');
    if (!settingsStr) throw new Error("API Settings not found");
    const apiSettings = JSON.parse(settingsStr);
    
    const apiKey = apiSettings.apiKey?.trim() || '';
    const baseUrl = apiSettings.baseUrl?.trim().replace(/\/+$/, '') || '';
    const model = apiSettings.model?.trim() || 'deepseek-chat';

    if (!apiKey || !baseUrl) {
      throw new Error("API Key 或 Base URL 未配置");
    }

    const systemPrompt = `你是一个后台静默记忆提取程序。请分析用户与紫微斗数大师的最新一轮对话。
提取目标（如果没有提取到新信息，对应的数组请留空）：
1. aiSummary: 大师对该命盘格局、性格作出的最新核心定性（不要长篇大论，每条不超过15字）。
2. validatedFacts: 用户明确反馈算得准的断语（例如用户说“确实最近破财了”，提炼为“反馈：近期破财”）。
3. userInfo: 用户自己袒露的现实背景信息（如“职业是老师”、“已婚”、“父母离异”等）。
请严格只输出合法的 JSON，格式如下：
{ "aiSummary": [], "validatedFacts": [], "userInfo": [] }`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `用户说：\n${userText}\n\nAI回复：\n${aiText}` }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Memory extraction failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const responseText = data.choices[0].message.content;
    
    let cleanText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const match = cleanText.match(/\{[\s\S]*\}/);
    if (match) cleanText = match[0];
    
    const extractedData = JSON.parse(cleanText);

    // 写入 localStorage 的安全逻辑
    const stored = localStorage.getItem('ziwei_memories');
    let memories = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(memories)) memories = [];

    let mem = memories.find((m: any) => m.chartId === chartId);
    if (!mem) {
      mem = { chartId, chartName: "未知命盘", aiSummary: [], validatedFacts: [], userInfo: [] };
      memories.push(mem);
    }

    if (extractedData.aiSummary?.length) mem.aiSummary = [...new Set([...mem.aiSummary, ...extractedData.aiSummary])];
    if (extractedData.validatedFacts?.length) mem.validatedFacts = [...new Set([...mem.validatedFacts, ...extractedData.validatedFacts])];
    if (extractedData.userInfo?.length) mem.userInfo = [...new Set([...mem.userInfo, ...extractedData.userInfo])];

    localStorage.setItem('ziwei_memories', JSON.stringify(memories));
    window.dispatchEvent(new Event('ziwei_memory_updated'));

    // 【深水炸弹 2】如果成功，必须把提取到的结果弹窗贴在脸上！
    alert("✅ 记忆提取大成功！请查看左侧记忆库。\n提取到内容：" + JSON.stringify(extractedData));

  } catch (error: any) {
    // 【深水炸弹 3】如果报错，死也要弹窗说明死因！
    alert("❌ 提炼过程崩溃，原因：\n" + (error.message || error));
  }
};
