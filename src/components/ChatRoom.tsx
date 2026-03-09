import * as React from 'react';
import { Component, useState, useRef, useEffect, Suspense } from 'react';
import { Send, Play, Loader2, Check, X, Bot, User, Trash2, Save, FolderOpen } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { parseWenMoTianJiToJSON } from '../utils/ziweiParser';
import { generateNativeChart } from '../utils/nativeChartGenerator';
import { extractAndSaveMemory } from '../utils/memoryExtractor';
import { astro } from 'iztro'; // 用于计算时间轴

// --- 🛡️ 防白屏核心：错误边界组件 ---
class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    // @ts-ignore
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, info: any) { console.error("星盘组件崩溃:", error, info); }
  render() { 
    // @ts-ignore
    if (this.state.hasError) return this.props.fallback;
    // @ts-ignore
    return this.props.children;
  }
}

// --- 组件懒加载 (带容错) ---
const Iztrolabe = React.lazy(async () => {
  try {
    const module = await import('react-iztro');
    // 兼容不同的导出方式，防止找不到组件
    const Comp = module.Iztrolabe || module.default || (module as any).default?.Iztrolabe;
    if (!Comp) throw new Error("未找到Iztrolabe导出");
    return { default: Comp };
  } catch (e) {
    console.error("加载失败:", e);
    // 返回一个占位组件，而不是让页面白屏
    return { default: () => <div className="text-red-500 p-4 border border-red-500 rounded">组件加载失败，请检查依赖</div> };
  }
});

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  isError?: boolean;
}

interface ExtractedFuel {
  conditions: string;
  conclusion: string;
  tags: string[];
}

interface Case {
  id: string;
  name: string;
  content: string;
  createdAt: number;
}

export type ChartMemory = {
  chartId: string; // 关联的命盘 ID
  chartName: string; // 冗余一份名字方便展示
  aiSummary: string[]; // 1. AI对格局、性格、处理问题方式的精炼总结
  validatedFacts: string[]; // 2. 用户反馈“算的对”的断语记录
  userInfo: string[]; // 3. 用户袒露的个人现实信息（如父母、婚姻状况等）
};

export default function ChatRoom() {
  const [chartText, setChartText] = useState('');
  const [messages, setMessages] = useLocalStorage<Message[]>('ziwei_chat_messages', [
    { id: '1', role: 'ai', content: '你好！我是紫微多维共振引擎。请在上方粘贴排盘数据，或直接与我对话。' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeChartText, setActiveChartText] = useLocalStorage<string | null>('ziwei_active_chart', null);
  
  // ✅ 新增：时间机器状态
  const [focusDate, setFocusDate] = useState<Date>(new Date());
  const [selectedDecadeIndex, setSelectedDecadeIndex] = useState<number>(-1);
  
  // Extraction state
  const [isExtracting, setIsExtracting] = useState(false);
  const [pendingFuel, setPendingFuel] = useState<ExtractedFuel | null>(null);

  // Cases state
  const [cases, setCases] = useLocalStorage<Case[]>('ziwei_cases', []);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);

  // Memories state
  const [memories, setMemories] = useLocalStorage<ChartMemory[]>('ziwei_memories', []);

  // 🕒 时间机器渲染函数 (使用 astro 核心算法)
  const renderTimeMachine = () => {
    if (!activeChartText) return null;
    try {
      let chartObj;
      try {
         let clean = activeChartText.trim();
         if (!clean.startsWith('{')) clean = clean.match(/\{[\s\S]*\}/)?.[0] || '';
         chartObj = JSON.parse(clean);
      } catch(e) { return null; }
      if (!chartObj?.rawParams) return null;

      // 使用 astro 核心算法计算大限
      const astrolabe = astro.bySolar(chartObj.rawParams.birthday, chartObj.rawParams.birthTime, chartObj.rawParams.gender, true, 'zh-CN');
      const decades = astrolabe.palaces.map((p, idx) => ({ ...p.decadal, palaceIndex: idx, name: p.name })).sort((a,b) => a.range[0] - b.range[0]);
      
      // 核心：使用农历年作为基准年，以符合虚岁逻辑
      const birthLunarYear = astrolabe.rawDates.lunarDate.lunarYear;
      const currentYear = focusDate.getFullYear();

      const getYearGanZhi = (year: number) => {
        const stems = "甲乙丙丁戊己庚辛壬癸";
        const branches = "子丑寅卯辰巳午未申酉戌亥";
        const stemIdx = (year - 4) % 10;
        const branchIdx = (year - 4) % 12;
        return stems[stemIdx < 0 ? stemIdx + 10 : stemIdx] + branches[branchIdx < 0 ? branchIdx + 12 : branchIdx];
      };

      return (
        <div className="bg-zinc-950 border-t border-zinc-800 p-3 flex flex-col gap-2 animate-in slide-in-from-bottom-4">
          <div className="flex justify-between text-xs text-emerald-400 font-mono">
            <span>⏳ 时空穿梭机</span>
            <span>当前推演: {currentYear}年</span>
          </div>
          {/* 大限轨道 */}
          <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {decades.map((d, idx) => {
              const startYear = birthLunarYear + d.range[0] - 1;
              const endYear = birthLunarYear + d.range[1] - 1;
              const isActive = currentYear >= startYear && currentYear <= endYear;
              return (
                <button key={idx} 
                  onClick={() => { 
                    const startYear = birthLunarYear + d.range[0] - 1;
                    const newDate = new Date(startYear, 6, 1);
                    console.log("点击大限:", { idx, startYear, ageRange: d.range, newDate });
                    setSelectedDecadeIndex(idx); 
                    setFocusDate(newDate); 
                  }}
                  className={`px-3 py-1 rounded border text-xs min-w-[85px] flex-shrink-0 flex flex-col items-center ${isActive ? 'border-emerald-500 bg-emerald-900/30 text-emerald-400' : 'border-zinc-800 text-zinc-500'}`}>
                  <div className="font-bold">{d.range[0]}-{d.range[1]}岁</div>
                  <div className="text-[10px] opacity-80">{d.heavenlyStem}{d.earthlyBranch}{d.name}限</div>
                </button>
              );
            })}
          </div>
          {/* 流年轨道 */}
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
             {(() => {
               const activeIdx = selectedDecadeIndex === -1 ? decades.findIndex(d => currentYear >= (birthLunarYear + d.range[0]-1) && currentYear <= (birthLunarYear + d.range[1]-1)) : selectedDecadeIndex;
               const d = decades[activeIdx];
               if(!d) return null;
               return Array.from({length:10}, (_,i) => birthLunarYear + d.range[0] - 1 + i).map(y => {
                 const age = y - birthLunarYear + 1;
                 const gz = getYearGanZhi(y);
                 return (
                   <button key={y} onClick={() => setFocusDate(new Date(y, 6, 1))}
                     className={`h-12 rounded text-[10px] border flex flex-col items-center justify-center leading-tight transition-colors ${y === currentYear ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600'}`}>
                     <div className="font-mono opacity-60">{y}年</div>
                     <div className="font-bold text-xs">{gz}</div>
                     <div className="scale-90 opacity-80">{age}岁</div>
                   </button>
                 );
               });
             })()}
          </div>
        </div>
      );
    } catch (e) { console.error("TimeMachine Error:", e); return null; }
  };

  const [fuels, setFuels] = useLocalStorage<any[]>('ziwei_fuels', []);
  const [activeRule] = useLocalStorage<any>('ziwei_active_rule', null);
  const [apiSettings] = useLocalStorage('ziwei_api_settings', {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini'
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Modal states
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [tempChartName, setTempChartName] = useState("");
  const [viewingChartContent, setViewingChartContent] = useState<string | null>(null);

  // Native Chart states
  const [activeTab, setActiveTab] = useState<'native' | 'import'>('native');
  const [nativeGender, setNativeGender] = useState<'男' | '女'>('男');
  const [nativeDate, setNativeDate] = useState('');
  const [nativeTime, setNativeTime] = useState('子时');
  const [pendingNativeData, setPendingNativeData] = useState<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getSafeChartId = () => {
    try {
      if (!activeChartText) return 'temp_' + Date.now();
      const cases = JSON.parse(localStorage.getItem('ziwei_cases') || '[]');
      const matched = cases.find((c: any) => activeChartText.includes(c.content) || c.content.includes(activeChartText));
      return matched ? matched.id : 'temp_' + Date.now();
    } catch (e) {
      return 'temp_' + Date.now();
    }
  };

  const streamChat = async (userMsg: string) => {
    const aiMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...(prev || []), { id: aiMessageId, role: 'ai', content: '' }]);

    const apiKey = apiSettings.apiKey.trim();
    const baseUrl = apiSettings.baseUrl.trim().replace(/\/+$/, '');
    const model = apiSettings.model.trim() || 'deepseek-chat';

    try {
      let systemPrompt = "你是一个名为'紫微多维共振引擎'的顶尖命理 AI。请严格遵守以下交互原则：\n\n1. 区分场景：如果用户只是闲聊、打招呼或测试（未提供排盘数据），请用简短、自然、拟人化的语气回应，**绝对不要**虚构示例命盘去长篇大论。\n2. 隐式推理（核心）：当你收到用户的排盘文本时，你必须在后台默默执行多宫联动、体用校验、同气提取等复杂计算，但**绝对禁止**将推演步骤（如'第一步看命宫'、'多维共振网络'等思考过程）输出给用户。\n3. 输出风格：直接输出最终的精炼结论。打破宿命论，多谈象意、变数与破局方向。语气要像一位深谙世事、通透豁达且极具人文关怀的智者，言辞精炼，留有余地，不要像一个正在汇报步骤的机器人。\n\n【三代四化全息推演】：你收到的数据包含 original (原局), decade (大限), year (流年) 三代四化。在解盘时，必须将这三层能量重叠分析。原局是基因，大限是环境，流年是触发。重点分析流年四化如何引动大限 and 原局的结构。\n\n【最高推演算法：全息三点定位法】\n面对用户的任何提问（无论是财运、感情、健康、人际还是置产），你绝对禁止只盯着对应的单一宫位看！你必须在后台自动执行以下【三点连线推理】，并将推理结果融合到你的回答中：\n\n📍 第一点：找【表象与工具】（当前事态的宫位）\n用户问什么事，就定位该事的主宫位（如问感情找夫妻宫，问钱找财帛宫，问病找疾厄宫）。分析该宫位星曜代表的表面状态、处理手段或客观境遇。\n\n📍 第二点：找【内核与基因】（命、福、身的交叉核对）\n这是最重要的一步！强制回头核对【命宫】（先天性格与格局）、【福德宫】（精神潜意识与执念）或【身宫】（后天归宿）。\n你必须向用户解释：【表象】之所以会发生，是因为你的【内核基因】决定了你会这样去选择和应对。例如：不是因为夫妻宫不好所以婚姻差，而是因为你福德宫的执念或命宫的性格，导致你必然会被夫妻宫那种特质的人吸引并产生摩擦。\n\n📍 第三点：找【外部刺激与暗礁】（对宫与暗合的拉扯）\n查看当前主宫位的【对宫】（冲）。对宫永远代表外部环境的刺激、出路或致命的破坏力。必须指出内外环境的矛盾或统一。\n\n【强制话术结构】：你的每一次深度解析，逻辑链条必须是：『你的内在核心特质是（第二点） -> 所以你在面对这个问题时，展现出的手段和遭遇是（第一点） -> 但需要注意外部环境或深层隐患带来的拉扯（第三点）』。不要生硬地罗列步骤，要将其写成通透、连贯的人文解析。";

      if (activeRule && activeRule.steps) {
        const stepsText = activeRule.steps.map((s: any) => `${s.title}\n${s.description}`).join('\n\n');
        systemPrompt += `\n\n请严格按照以下【${activeRule.name}】的步骤和逻辑来进行解盘：\n你必须像侦探一样，严格按照这几步的逻辑链条，前一步是后一步的限制条件，串联出用户的命运因果线，绝不允许直接抛出碎片化的算命断语！\n\n${stepsText}`;
      }

      if (activeChartText) {
        if (activeChartText.includes('【命盘B')) {
          systemPrompt = "【当前处于双人合盘（Synastry）分析模式】\n你收到了两个命盘的数据。请绝对遵循以下合盘分析法则：\n1. 核心交叉看盘：必须对比双方的【命宫】（性格匹配度）、【夫妻宫】（对伴侣的期望与对待关系）、【财帛/官禄宫】（事业财富的协同或消耗）。\n2. 寻找化学反应：分析一方的生年四化是否飞入另一方的关键宫位（如A的化禄入B的财帛，主A旺B财）。\n3. 输出要求：不要单独解盘，必须句句扣紧“两人在一起会怎样”。重点输出相处模式、感情雷区、财富协同建议，以及如何化解两人性格中的结构性矛盾。\n\n" + systemPrompt;
        }
        systemPrompt += `\n\n【当前正在分析的全局命盘数据（绝对不可忽略细节与杂曜）】：\n${activeChartText}`;

        // 尝试注入记忆
        try {
          const storedCasesStr = localStorage.getItem('ziwei_cases');
          let chartId = 'unknown';
          if (storedCasesStr) {
             const storedCases = JSON.parse(storedCasesStr);
             const matchedCase = storedCases.find((c: any) => c.content === activeChartText);
             if (matchedCase) {
               chartId = matchedCase.id;
             }
          }
          if (chartId !== 'unknown') {
            const memoriesStr = localStorage.getItem('ziwei_memories');
            if (memoriesStr) {
              const allMemories = JSON.parse(memoriesStr);
              const memory = allMemories.find((m: any) => m.chartId === chartId);
              if (memory && (memory.aiSummary?.length > 0 || memory.validatedFacts?.length > 0 || memory.userInfo?.length > 0)) {
                systemPrompt += `\n\n【专属记忆库（仅供参考，请根据这些现实反馈更精准地解盘，不要在回复中生硬地复述它们）】\n`;
                if (memory.userInfo?.length > 0) {
                  systemPrompt += `- 客户现实背景：${memory.userInfo.join('；')}\n`;
                }
                if (memory.validatedFacts?.length > 0) {
                  systemPrompt += `- 已验证的断语：${memory.validatedFacts.join('；')}\n`;
                }
                if (memory.aiSummary?.length > 0) {
                  systemPrompt += `- 命盘核心总结：${memory.aiSummary.join('；')}\n`;
                }
              }
            }
          }
        } catch (e) {
          console.error("注入记忆失败", e);
        }
      }

      const chatMessages = [
        { role: 'system', content: systemPrompt },
        ...(messages || []).map(m => ({ role: m.role === 'ai' ? 'assistant' : m.role, content: m.content })),
        { role: 'user', content: userMsg }
      ];

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: chatMessages,
          stream: false,
        })
      });

      if (!response.ok) {
        let errorMsg = `HTTP Error ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error?.message) {
            errorMsg = errorData.error.message;
          }
        } catch (e) {
          // Ignore JSON parse error if response is not JSON
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      console.log("API返回完整数据:", data);
      const replyText = data.choices[0].message.content;
      
      setMessages(prev => (prev || []).map(msg => 
        msg.id === aiMessageId ? { ...msg, content: replyText } : msg
      ));

      // 触发静默记忆提取
      const safeChartId = getSafeChartId();
      extractAndSaveMemory(safeChartId, userMsg, replyText);

    } catch (error: any) {
      setMessages(prev => {
        const safePrev = prev || [];
        const filtered = safePrev.filter(msg => msg.id !== aiMessageId);
        return [...filtered, { id: Date.now().toString(), role: 'ai', content: `接口调用失败，原因：${error.message}`, isError: true }];
      });
    }
  };

  const handleStartAnalysis = async () => {
    if (!chartText.trim()) return;
    if (!apiSettings.apiKey.trim()) {
      alert("请先配置 API Key");
      return;
    }
    
    setIsAnalyzing(true);
    
    const parsedContent = JSON.stringify(parseWenMoTianJiToJSON(chartText), null, 2);
    const userMsg = `[提交排盘数据]\n${parsedContent}`;
    const newUserMessage: Message = { id: Date.now().toString(), role: 'user', content: userMsg };
    
    setMessages(prev => [...(prev || []), newUserMessage]);
    setChartText('');

    setActiveChartText(userMsg);

    await streamChat(userMsg);
    setIsAnalyzing(false);
  };

  const ExtractFuel = async (userText: string, aiText: string) => {
    setIsExtracting(true);
    setPendingFuel(null);
    
    const apiKey = apiSettings.apiKey.trim();
    const baseUrl = apiSettings.baseUrl.trim().replace(/\/+$/, '');
    const model = apiSettings.model.trim() || 'deepseek-chat';

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: '你是一个紫微斗数数据架构师。请根据用户的反馈，修正或提炼紫微规则。必须严格返回 JSON 格式，包含字段：conditions (宫位和星曜), conclusion (现实断语), tags (标签数组)。不要输出任何多余的 Markdown 或解释文本。'
            },
            {
              role: 'user',
              content: `AI之前的回复：\n${aiText}\n\n用户的反馈：\n${userText}`
            }
          ],
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        let errorMsg = `HTTP Error ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error?.message) {
            errorMsg = errorData.error.message;
          }
        } catch (e) {
          // Ignore JSON parse error if response is not JSON
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);
      
      setPendingFuel({
        conditions: parsed.conditions || '未知条件',
        conclusion: parsed.conclusion || '未知断语',
        tags: Array.isArray(parsed.tags) ? parsed.tags : []
      });
    } catch (error: any) {
      console.error("Extraction failed:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        content: `后台提取失败，原因：${error.message}`,
        isError: true
      }]);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    if (!apiSettings.apiKey.trim()) {
      alert("请先配置 API Key");
      return;
    }
    
    const userMsg = inputValue.trim();
    const newUserMessage: Message = { id: Date.now().toString(), role: 'user', content: userMsg };
    
    setMessages(prev => [...(prev || []), newUserMessage]);
    setInputValue('');

    if (userMsg.length > 200 && (userMsg.includes('命盘') || userMsg.includes('文墨天机') || userMsg.includes('宫'))) {
      setActiveChartText(userMsg);
    }

    await streamChat(userMsg);
  };

  const handleConfirmFuel = () => {
    if (!pendingFuel) return;
    
    const newFuel = {
      id: Date.now().toString(),
      condition: pendingFuel.conditions,
      feedback: pendingFuel.conclusion,
      tags: pendingFuel.tags.join(', ')
    };
    
    setFuels([...fuels, newFuel]);
    setPendingFuel(null);
    
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'ai',
      content: '✅ 新燃料已成功入库！我的知识库已更新，感谢你的反馈。'
    }]);
  };

  const handleIgnoreFuel = () => {
    setPendingFuel(null);
  };

  const handleClearChat = () => {
    setShowClearConfirm(true);
  };

  const executeClearChat = () => {
    // 1. 强制清理底层存储
    window.localStorage.removeItem('ziwei_chat_messages');
    window.localStorage.removeItem('ziwei_active_chart');
    
    // 2. 强制调用 State Setter 刷新视图
    setMessages([{ id: Date.now().toString(), role: 'ai', content: '你好，我是紫微多维共振引擎。您可以粘贴命盘给我。' }]);
    setActiveChartText('');
    setPendingFuel(null);
    setIsExtracting(false);
    setShowClearConfirm(false);
  };

  const handleSaveChart = () => {
    if (!chartText || chartText.trim() === "") {
      alert("⚠️ 请先在文本框中粘贴排盘数据！");
      return;
    }
    setPendingNativeData(null); // 清空原生排盘数据，防止串线
    setTempChartName("");
    setShowSavePrompt(true);
  };

  const executeSaveChart = () => {
    if (!tempChartName || tempChartName.trim() === "") return;

    try {
      // 安全读取历史记录
      const stored = window.localStorage.getItem('ziwei_cases');
      let oldCases: Case[] = [];
      if (stored) {
        oldCases = JSON.parse(stored);
        if (!Array.isArray(oldCases)) oldCases = [];
      }

      let finalContent = "";
      
      // 判断当前是原生排盘的数据，还是文本框导入的数据
      if (pendingNativeData) {
        finalContent = JSON.stringify(pendingNativeData, null, 2);
      } else {
        if (!chartText || chartText.trim() === "") return;
        finalContent = JSON.stringify(parseWenMoTianJiToJSON(chartText), null, 2);
      }

      const newCases = [...oldCases, { id: Date.now().toString(), name: tempChartName.trim(), content: finalContent, createdAt: Date.now() }];
      window.localStorage.setItem('ziwei_cases', JSON.stringify(newCases));
      setCases(newCases);
      
      alert("✅ 命盘 [" + tempChartName + "] 保存成功！");
      setChartText(''); // 保存成功后清空输入框
      setShowSavePrompt(false);
      setPendingNativeData(null); // 保存后清空临时原生数据
    } catch (error) {
      console.error("保存失败:", error);
      alert("保存失败，请检查控制台。");
    }
  };

  const handleGenerateNativeChart = () => {
    if (!nativeDate) { alert("请选择日期"); return; }
    // 调用新的排盘器
    const chartData = generateNativeChart(nativeDate, nativeTime, nativeGender);
    if (!chartData) { alert("排盘失败"); return; }
    const json = JSON.stringify(chartData, null, 2);
    setActiveChartText(json); // 存入
    // 自动保存逻辑...
    const name = `[原生] ${nativeDate} ${nativeTime}`;
    const newCases = [...cases, { id: Date.now().toString(), name, content: json, createdAt: Date.now() }];
    setCases(newCases);
  };

  const handleToggleCaseSelection = (caseId: string) => {
    setSelectedCaseIds(prev => {
      if (prev.includes(caseId)) {
        return prev.filter(id => id !== caseId);
      } else {
        if (prev.length >= 2) {
          alert("最多只能同时勾选 2 个命盘进行合盘分析！");
          return prev;
        }
        return [...prev, caseId];
      }
    });
  };

  const handleLoadSelectedCases = async () => {
    if (selectedCaseIds.length === 0) return;

    let userMsg = '';
    
    if (selectedCaseIds.length === 1) {
      const c = cases.find(c => c.id === selectedCaseIds[0]);
      if (c) {
        userMsg = `[提交排盘数据]\n【命盘A（${c.name}）】：\n${c.content}`;
      }
    } else if (selectedCaseIds.length === 2) {
      const c1 = cases.find(c => c.id === selectedCaseIds[0]);
      const c2 = cases.find(c => c.id === selectedCaseIds[1]);
      if (c1 && c2) {
        userMsg = `[提交排盘数据]\n【命盘A（${c1.name}）】：\n${c1.content}\n\n【命盘B（${c2.name}）】：\n${c2.content}`;
      }
    }

    if (userMsg) {
      const newUserMessage: Message = { id: Date.now().toString(), role: 'user', content: userMsg };
      setMessages(prev => [...(prev || []), newUserMessage]);
      setActiveChartText(userMsg);
      setIsCaseModalOpen(false);
      setSelectedCaseIds([]);
      setIsAnalyzing(true);
      await streamChat(userMsg);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-4 h-full w-full overflow-hidden p-4 max-w-[1600px] mx-auto relative">
      {/* 左侧面板 */}
      <div className="w-full xl:w-1/2 flex-shrink-0 bg-gray-50 dark:bg-gray-900 rounded-lg shadow-inner overflow-hidden flex flex-col border border-zinc-800 relative">
        <div className="flex-1 overflow-auto flex justify-center items-start pt-4 relative min-h-[500px] xl:min-h-0">
          {activeChartText ? (
            <ErrorBoundary fallback={<div className="p-8 text-red-500 text-center">星盘组件渲染出错，请检查控制台</div>}>
              <Suspense fallback={<div className="text-emerald-500 p-20 flex items-center gap-2"><Loader2 className="animate-spin"/>加载中...</div>}>
                 {(() => {
                    try {
                      let clean = activeChartText;
                      if (!clean.startsWith('{')) clean = clean.match(/\{[\s\S]*\}/)?.[0] || '{}';
                      const obj = JSON.parse(clean);
                      if (!obj.rawParams) return <div className="p-10 text-zinc-500 text-center mt-20">文本导入的旧数据不支持互动，请使用原生排盘</div>;
                      
                      const iztroKey = `iztro-${selectedDecadeIndex}-${focusDate.getTime()}`;
                      
                      return (
                        <div className="relative transform scale-90 origin-top pb-10">
                          <Iztrolabe 
                            key={iztroKey}
                            birthday={obj.rawParams.birthday}
                            birthTime={obj.rawParams.birthTime}
                            birthdayType={obj.rawParams.birthdayType}
                            gender={obj.rawParams.gender}
                            horoscopeDate={focusDate} // ✅ 绑定状态，流年随时间轴变动
                            horoscopeHour={new Date().getHours()}
                          />
                        </div>
                      );
                    } catch(e) { return <div className="p-10 text-red-500">数据解析错误</div> }
                 })()}
              </Suspense>
            </ErrorBoundary>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 gap-4">
              <span className="text-4xl">🌌</span>
              <p>请在右侧输入生辰</p>
            </div>
          )}
        </div>
        {/* 插入时间机器面板 */}
        {renderTimeMachine()}
      </div>

      {/* Right Pane: Chat Interface */}
      <div className="w-full xl:w-1/2 flex flex-col flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden relative">
        {/* Top: Chart Input */}
        <div className="bg-zinc-950/50 border-b border-zinc-800 p-4 relative z-[999] pointer-events-auto">
          <div className="flex items-center justify-between mb-4 relative z-[999] pointer-events-auto">
            <div className="flex gap-6 border-b border-zinc-800 w-full">
              <button
                type="button"
                onClick={() => setActiveTab('native')}
                className={`pb-2 text-sm font-medium transition-colors relative -bottom-[1px] ${activeTab === 'native' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                原生排盘
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('import')}
                className={`pb-2 text-sm font-medium transition-colors relative -bottom-[1px] ${activeTab === 'import' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                文本导入
              </button>
            </div>
            <div className="absolute top-0 right-0 relative z-[999] pointer-events-auto">
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log("【强制突破】清空对话被点击！");
                  handleClearChat();
                }}
                className="text-xs flex items-center gap-1 text-zinc-500 hover:text-red-400 transition-colors relative z-[999]"
                title="清空对话"
              >
                <Trash2 size={12} />
                清空对话
              </button>
            </div>
          </div>

          {activeTab === 'native' ? (
            <div className="flex gap-3 items-end relative z-[999] pointer-events-auto">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500">性别</label>
                <select 
                  value={nativeGender}
                  onChange={e => setNativeGender(e.target.value as '男' | '女')}
                  className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-9"
                >
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-zinc-500">阳历出生日期</label>
                <input 
                  type="date"
                  value={nativeDate}
                  onChange={e => setNativeDate(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-9"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-zinc-500">出生时辰</label>
                <select 
                  value={nativeTime}
                  onChange={e => setNativeTime(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-9"
                >
                  {['子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleGenerateNativeChart}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 h-9"
                >
                  🔮 立即生成命盘
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsCaseModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-sm font-medium transition-colors flex items-center gap-1 h-9"
                >
                  <FolderOpen size={14} />
                  选择命盘
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 relative z-[999] pointer-events-auto">
              <textarea
                value={chartText}
                onChange={e => setChartText(e.target.value)}
                placeholder="在此粘贴文墨天机排盘纯文本..."
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none h-16"
              />
              <div className="flex flex-col gap-2 shrink-0 relative z-[999] pointer-events-auto">
                <div className="flex gap-2 relative z-[999] pointer-events-auto">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("【强制突破】保存为命盘被点击！");
                      handleSaveChart();
                    }}
                    disabled={!chartText.trim()}
                    className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 rounded-md text-xs font-medium transition-colors flex items-center gap-1 h-7 relative z-[999]"
                  >
                    <Save size={14} />
                    保存为命盘
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsCaseModalOpen(true);
                    }}
                    className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-xs font-medium transition-colors flex items-center gap-1 h-7 relative z-[999]"
                  >
                    <FolderOpen size={14} />
                    选择命盘
                  </button>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleStartAnalysis();
                  }}
                  disabled={isAnalyzing || !chartText.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 h-7 flex-1 relative z-[999]"
                >
                  {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  开始解析
                </button>
              </div>
            </div>
          )}
        </div>

        {activeChartText && (
          <div className="bg-emerald-900/30 border-b border-emerald-800/50 px-4 py-2 flex items-center gap-2 text-emerald-400 text-xs">
            <span>{activeChartText.includes('【命盘B') ? '📌 已锁定双人合盘上下文' : '📌 已锁定当前命盘上下文'}</span>
            <button onClick={() => setActiveChartText('')} className="ml-auto hover:text-emerald-300 transition-colors">
              <X size={14} />
            </button>
          </div>
        )}
        {/* Middle: Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-950/30">
          {(messages || []).map((msg, index) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-zinc-800 text-zinc-400' : 'bg-emerald-900/50 text-emerald-400 border border-emerald-800'
              }`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`max-w-[80%] flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-zinc-800 text-zinc-200 rounded-tr-sm' 
                    : msg.isError 
                      ? 'bg-red-500/10 border border-red-500/20 text-red-400 rounded-tl-sm'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-sm'
                }`}>
                  {msg.content ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    msg.role === 'ai' && !msg.isError && (
                      <div className="flex items-center gap-2 text-emerald-500">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-xs animate-pulse">思考中...</span>
                      </div>
                    )
                  )}
                </div>
                {msg.role === 'user' && (
                  <button 
                    onClick={() => {
                      let aiText = '无';
                      for (let i = index - 1; i >= 0; i--) {
                        if (messages[i].role === 'ai') {
                          aiText = messages[i].content;
                          break;
                        }
                      }
                      ExtractFuel(msg.content, aiText);
                    }}
                    className="text-[10px] text-zinc-500 hover:text-emerald-400 flex items-center gap-1 mt-1 transition-colors"
                    title="提炼为规则"
                  >
                    💡 提炼为规则
                  </button>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom: Input Area */}
        <div className="p-4 bg-zinc-950/50 border-t border-zinc-800">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              placeholder="输入追问，或提供现实反馈（如：其实我没有破财，反而升职了...）"
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-5 py-3 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white flex items-center justify-center transition-colors shrink-0"
            >
              <Send size={18} className="ml-0.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Extracting Indicator */}
      {isExtracting && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-zinc-900 border border-emerald-500/30 rounded-lg p-4 shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <Loader2 size={20} className="text-emerald-500 animate-spin" />
          <span className="text-sm text-emerald-400 font-medium">正在提炼规则...</span>
        </div>
      )}

      {/* Pending Fuel Modal */}
      {pendingFuel && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-emerald-500/30 rounded-xl w-[500px] max-w-[90vw] shadow-2xl p-6 shadow-emerald-900/20 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <h3 className="text-lg font-medium text-emerald-400">发现新燃料</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Conditions (触发条件)</label>
                <div className="text-sm text-zinc-200 font-mono bg-zinc-950 px-3 py-2 rounded border border-zinc-800">
                  {pendingFuel.conditions}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Conclusion (现实断语)</label>
                <div className="text-sm text-zinc-200 bg-zinc-950 px-3 py-2 rounded border border-zinc-800">
                  {pendingFuel.conclusion}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Tags (标签)</label>
                <div className="flex flex-wrap gap-2">
                  {pendingFuel.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded text-xs border border-zinc-700">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={handleIgnoreFuel}
                className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <X size={16} />
                忽略
              </button>
              <button
                onClick={handleConfirmFuel}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-md text-sm font-medium transition-colors"
              >
                <Check size={16} />
                确认入库
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Case Library Modal */}
      {isCaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-[500px] max-w-[90vw] shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h3 className="text-lg font-medium text-zinc-100 flex items-center gap-2">
                <FolderOpen size={18} className="text-emerald-500" />
                命盘库 (Chart Library)
              </h3>
              <button 
                onClick={() => {
                  setIsCaseModalOpen(false);
                  setSelectedCaseIds([]);
                }}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5">
              {cases.length === 0 ? (
                <div className="text-center text-zinc-500 py-8">
                  暂无保存的命盘。请在排盘输入区点击“保存为命盘”。
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-zinc-400 mb-4">
                    请选择要解析的命盘。选择 1 个进行单盘解析，选择 2 个进行双人合盘（Synastry）分析。
                  </p>
                  {cases.map(c => (
                    <label 
                      key={c.id} 
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedCaseIds.includes(c.id) 
                          ? 'bg-emerald-900/20 border-emerald-500/50' 
                          : 'bg-zinc-950/50 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        className="mt-1 w-4 h-4 rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900 bg-zinc-900"
                        checked={selectedCaseIds.includes(c.id)}
                        onChange={() => handleToggleCaseSelection(c.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-zinc-200 truncate">{c.name}</div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {new Date(c.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={(e) => { 
                          e.preventDefault();
                          e.stopPropagation(); 
                          setViewingChartContent(c.content); 
                        }} 
                        className="text-zinc-500 hover:text-emerald-400 text-xs flex items-center gap-1 transition-colors px-2 shrink-0"
                      >
                        👁️ 查看
                      </button>
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-zinc-800 bg-zinc-950/50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsCaseModalOpen(false);
                  setSelectedCaseIds([]);
                }}
                className="px-4 py-2 rounded-md text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleLoadSelectedCases}
                disabled={selectedCaseIds.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Play size={16} />
                {selectedCaseIds.length === 2 ? '加载双人合盘' : '确认加载命盘'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirm Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-[400px] max-w-[90vw] shadow-2xl p-6">
            <h3 className="text-lg font-medium text-zinc-100 mb-4">清空对话</h3>
            <p className="text-zinc-400 text-sm mb-6">确定要清空所有聊天记录并解锁当前命盘吗？此操作不可恢复。</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-md text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                取消
              </button>
              <button
                onClick={executeClearChat}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md text-sm font-medium transition-colors"
              >
                确定清空
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Prompt Modal */}
      {showSavePrompt && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-[400px] max-w-[90vw] shadow-2xl p-6">
            <h3 className="text-lg font-medium text-zinc-100 mb-4">保存命盘</h3>
            <p className="text-zinc-400 text-sm mb-4">请输入该命盘的归属人姓名或备注：</p>
            <input
              type="text"
              value={tempChartName}
              onChange={(e) => setTempChartName(e.target.value)}
              placeholder="例如：张三的命盘"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 mb-6"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSavePrompt(false)}
                className="px-4 py-2 rounded-md text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                取消
              </button>
              <button
                onClick={executeSaveChart}
                disabled={!tempChartName.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-md text-sm font-medium transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JSON Viewer Modal */}
      {viewingChartContent !== null && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-[800px] max-w-[90vw] shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h3 className="text-lg font-medium text-zinc-100 flex items-center gap-2">
                <Bot size={18} className="text-emerald-500" />
                命盘数据透视 (JSON Viewer)
              </h3>
              <button 
                onClick={() => setViewingChartContent(null)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 bg-zinc-950/50">
              <pre className="text-xs text-emerald-300 font-mono whitespace-pre-wrap bg-zinc-900 p-4 rounded border border-zinc-800">
                {(() => {
                  try {
                    const parsed = typeof viewingChartContent === 'string' ? JSON.parse(viewingChartContent) : viewingChartContent;
                    return JSON.stringify(parsed, null, 2);
                  } catch (e) {
                    return String(viewingChartContent);
                  }
                })()}
              </pre>
            </div>
            
            <div className="p-4 border-t border-zinc-800 bg-zinc-950/50 flex justify-end">
              <button
                onClick={() => setViewingChartContent(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-sm font-medium transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
