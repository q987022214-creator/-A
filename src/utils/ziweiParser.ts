export function parseWenMoTianJiToJSON(rawText: string) {
  try {
    if (typeof rawText === 'string' && (rawText.trim().startsWith('{') || rawText.trim().startsWith('['))) {
      return JSON.parse(rawText);
    }
    const result: any = { basicInfo: {}, palaces: [], timeline: [] };
    
    // 1. 基础信息提取
    const basicRegex = /(性别|五行局数|命主|身主|农历时间)\s*[:：]\s*([^\n│├└┌]+)/g;
    let match;
    while ((match = basicRegex.exec(rawText)) !== null) {
      result.basicInfo[match[1].trim()] = match[2].trim();
    }

    // 2. 原局十二宫提取
    const palaceBlocks = rawText.split(/├(?=\S{1,2}\s*宫\[)/);
    for (let i = 1; i < palaceBlocks.length; i++) {
      const block = palaceBlocks[i];
      const nameMatch = block.match(/^([^\n\[]+)\[([^\n\]]+)\]/);
      if (!nameMatch) continue;
      
      const palace: any = {
        name: nameMatch[1].replace(/\s+/g, ''),
        ganzhi: nameMatch[2],
        stars: []
      };
      
      const starsMatch = block.match(/(主星|辅星|小星)\s*[:：]\s*([^\n│├└┌]+)/g);
      if (starsMatch) {
        starsMatch.forEach(line => {
          const parts = line.split(/[:：]/);
          if (parts[1] && parts[1].trim() !== '无') palace.stars.push(parts[1].trim());
        });
      }
      result.palaces.push(palace);
      if (result.palaces.length === 12) break;
    }
    
    // 3. 大限流年提取 (物理切割法，绝对防弹)
    const timelineIndex = rawText.indexOf('大限流年信息');
    if (timelineIndex !== -1) {
      // 抹除多余制表符
      const cleanLine = rawText.substring(timelineIndex).replace(/[│├└┌]/g, '');
      
      // 按大限块切割
      const decadeBlocks = cleanLine.split(/第\d+大限\[/);
      
      for (let i = 1; i < decadeBlocks.length; i++) {
        const block = decadeBlocks[i];
        
        // 利用正向预查，精准截断
        const ganzhiMatch = block.match(/^([^\]]+)\]/);
        const ageMatch = block.match(/起止年份\s*[:：]\s*([\s\S]*?)(?=大限四化)/);
        const sihuaMatch = block.match(/大限四化\s*[:：]\s*([\s\S]*?)(?=流年)/);
        
        const decadeObj: any = {
          decadeName: `第${i}大限`,
          ganzhi: ganzhiMatch ? ganzhiMatch[1].trim() : "",
          ageRange: ageMatch ? ageMatch[1].replace(/\s+/g, '') : "",
          sihua: sihuaMatch ? sihuaMatch[1].replace(/\s+/g, '') : "",
          years: []
        };
        
        // 按年份精准劈开（例如 "1995年[乙亥](2虚岁)"）
        const yearBlocks = block.split(/(\d{4}年\[[^\]]+\](?:\(\d+虚岁\))?)/);
        
        for (let j = 1; j < yearBlocks.length; j += 2) {
           const title = yearBlocks[j];
           const content = yearBlocks[j+1] || "";
           
           const titleMatch = title.match(/(\d{4})年\[([^\]]+)\](?:\((\d+)虚岁\))?/);
           const pMatch = content.match(/命宫干支\s*[:：]\s*([^\n\s]+)/);
           // .* 只匹配单行，完美避免跨行污染
           const sMatch = content.match(/流年四化\s*[:：]\s*(.*)/); 
           
           if (titleMatch) {
             const y = titleMatch[1];
             const g = titleMatch[2].trim();
             const a = titleMatch[3] ? `${titleMatch[3]}岁` : "";
             const p = pMatch ? `命:${pMatch[1].trim()}` : "";
             const s = sMatch ? `化:${sMatch[1].trim()}` : "";
             
             // 采用高密度管道符拼接，极致压缩 Token
             decadeObj.years.push(`${y}|${g}|${a}|${p}|${s}`);
           }
        }
        result.timeline.push(decadeObj);
      }
    }
    return result;
  } catch (error) {
    console.error("解析失败:", error);
    return { error: "解析遇到异常", rawText: rawText.substring(0, 100) };
  }
}
