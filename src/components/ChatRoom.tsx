// src/components/ChatRoom.tsx
import React, { useState, useRef, useEffect, Suspense, Component } from 'react';
import { Send, Play, Loader2, Check, X, Bot, User, Trash2, Save, FolderOpen, LayoutDashboard, Compass, Target, Zap } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { parseWenMoTianJiToJSON } from '../utils/ziweiParser';
import { generateNativeChart } from '../utils/nativeChartGenerator';
import { extractAndSaveMemory } from '../utils/memoryExtractor';
import { buildAIPayload, DynamicContext } from '../utils/aiPromptBuilder';
import { astro } from 'iztro';
import PalaceScoreTable from './PalaceScoreTable';
import { ChatBubble } from './ChatBubble';

interface ErrorBoundaryProps {
  fallback: React.ReactNode;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends (Component as any) {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any, info: any) {
    console.error("星盘组件崩溃:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const Iztrolabe = React.lazy(async () => {
  try {
    const module = await import('react-iztro');
    const Comp = module.Iztrolabe || module.default || (module as any).default?.Iztrolabe;
    if (!Comp) throw new Error("未找到Iztrolabe导出");
    return { default: Comp };
  } catch (e) {
    return { default: () => <div className="text-red-500 p-4 border border-red-500 rounded">组件加载失败</div> };
  }
});

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  isError?: boolean;
  payload?: string;
}

export default function ChatRoom() {
  const [chartText, setChartText] = useState('');
  const [messages, setMessages] = useLocalStorage<Message[]>('ziwei_chat_messages', [
    { id: '1', role: 'ai', content: '你好！我是紫微多维共振引擎。请在上方粘贴排盘数据，或直接与我对话。' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [activeChartText, setActiveChartText] = useLocalStorage<string | null>('ziwei_active_chart', null);
  
  const [leftPanelView, setLeftPanelView] = useState<'astrolabe' | 'score'>('astrolabe');
  const [focusDate, setFocusDate] = useState<Date>(new Date());
  const [selectedDecadeIndex, setSelectedDecadeIndex] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  
  const [isExtracting, setIsExtracting] = useState(false);
  const [pendingFuel, setPendingFuel] = useState<any>(null);
  const [cases, setCases] = useLocalStorage<any[]>('ziwei_cases', []);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [apiSettings] = useLocalStorage('ziwei_api_settings', { baseUrl: 'https://api.openai.com/v1', apiKey: '', model: 'gpt-4o-mini' });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [tempChartName, setTempChartName] = useState("");
  const [viewingChartContent, setViewingChartContent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'native' | 'import'>('native');
  const [nativeGender, setNativeGender] = useState<'男' | '女'>('男');
  const [nativeDate, setNativeDate] = useState('');
  const [nativeTime, setNativeTime] = useState('子时');
  const [pendingNativeData, setPendingNativeData] = useState<any>(null);
  const [activeRule] = useLocalStorage<any>('ziwei_active_rule', null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => scrollToBottom(), [messages]);

  const SI_HUA_MAP: Record<string, string> = {
    '甲': '廉贞化禄、破军化权、武曲化科、太阳化忌', '乙': '天机化禄、天梁化权、紫微化科、太阴化忌',
    '丙': '天同化禄、天机化权、文昌化科、廉贞化忌', '丁': '太阴化禄、天同化权、天机化科、巨门化忌',
    '戊': '贪狼化禄、太阴化权、右弼化科、天机化忌', '己': '武曲化禄、贪狼化权、天梁化科、文曲化忌',
    '庚': '太阳化禄、武曲化权、太阴化科、天同化忌', '辛': '巨门化禄、太阳化权、文曲化科、文昌化忌',
    '壬': '天梁化禄、紫微化权、左辅化科、武曲化忌', '癸': '破军化禄、巨门化权、太阴化科、天同化忌',
  };

  const getYearGanZhi = (year: number) => {
    const stems = "甲乙丙丁戊己庚辛壬癸"; const branches = "子丑寅卯辰巳午未申酉戌亥";
    const stemIdx = (year - 4) % 10; const branchIdx = (year - 4) % 12;
    return stems[stemIdx < 0 ? stemIdx + 10 : stemIdx] + branches[branchIdx < 0 ? branchIdx + 12 : branchIdx];
  };

  // 🚀 核心流转引擎
  const streamChat = async (userPromptForAI: string, hasEmbeddedPayload: boolean = false) => {
    const aiMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...(prev || []), { id: aiMessageId, role: 'ai', content: '' }]);

    const apiKey = apiSettings.apiKey.trim();
    const baseUrl = apiSettings.baseUrl.trim().replace(/\/+$/, '');

    // 🌟 本地测试模式：如果没有填 API Key，不要报错，直接返回测试文本
    if (!apiKey || !baseUrl) {
      setTimeout(() => {
        setMessages(prev => (prev || []).map(msg => 
          msg.id === aiMessageId ? { 
            ...msg, 
            content: "【本地测试模式】未检测到 API 密钥，大模型暂未启动。\n但底层的三盘叠影数据已成功打包！请点开您上一条消息的【▶ 后台隐式推演数据包 (Payload)】进行格式检验与复制。" 
          } : msg
        ));
      }, 800); // 模拟一下思考的延迟
      return;
    }
    
    try {
      let systemPrompt = "你是一个名为'紫微多维共振引擎'的顶尖命理 AI。请严格使用【三盘叠影法】进行推断，必须以地支为物理坐标对齐原局、大限、流年。语言精炼通透，打破宿命论。";

      if (activeChartText && !hasEmbeddedPayload) {
        if (activeChartText.includes('【命盘B')) {
          systemPrompt += `\n\n【双人合盘数据】：\n${activeChartText}`;
        } else {
          try {
            const chartObj = JSON.parse(activeChartText);
            const aiPayload = buildAIPayload(chartObj); 
            systemPrompt += `\n\n【全息命盘结构化数据包(原局)】：\n${JSON.stringify(aiPayload, null, 2)}`;
          } catch(e) {
            systemPrompt += `\n\n【命盘基础数据】：\n${activeChartText}`;
          }
        }
      }

      const chatMessages = [
        { role: 'system', content: systemPrompt },
        ...(messages || []).map(m => ({ role: m.role === 'ai' ? 'assistant' : m.role, content: m.content })),
        { role: 'user', content: userPromptForAI } 
      ];

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: apiSettings.model.trim() || 'deepseek-chat', messages: chatMessages })
      });

      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
      const data = await response.json();
      const replyText = data.choices[0].message.content;
      
      setMessages(prev => (prev || []).map(msg => msg.id === aiMessageId ? { ...msg, content: replyText } : msg));
    } catch (error: any) {
      setMessages(prev => {
        const safePrev = prev || [];
        const filtered = safePrev.filter(msg => msg.id !== aiMessageId);
        return [...filtered, { id: Date.now().toString(), role: 'ai', content: `接口调用失败。原因：${error.message}`, isError: true }];
      });
    }
  };

  // 🚀 发送消息总控 (取消了强制 API 检查)
  const handleSendMessage = async (customPromptForAI?: string, displayContent?: string, payloadStr?: string) => {
    const promptForAI = customPromptForAI || inputValue.trim();
    if (!promptForAI) return;
    
    // UI 展示的消息，包裹 Payload 数据
    const newUserMessage: Message = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: displayContent || promptForAI, 
      payload: payloadStr 
    };
    
    setMessages(prev => [...(prev || []), newUserMessage]);
    if (!customPromptForAI) setInputValue('');

    // 发给 AI 的终极组装
    let finalPromptToAI = promptForAI;
    if (payloadStr) {
        finalPromptToAI += `\n\n【附加命理数据包】：\n${payloadStr}`;
    }

    await streamChat(finalPromptToAI, !!payloadStr);
  };

  const handleStartAnalysis = async () => {
    if (!chartText.trim()) return;
    
    setIsAnalyzing(true);
    try {
      const parsedObj = parseWenMoTianJiToJSON(chartText);
      const pureJsonStr = JSON.stringify(parsedObj, null, 2);
      
      setActiveChartText(pureJsonStr); 
      
      const aiPayload = buildAIPayload(parsedObj);
      const payloadStr = JSON.stringify(aiPayload, null, 2);

      const displayContent = `🔮 成功导入并解析排盘文本。请基于原局为我推算。`;
      const promptToAI = `我已提交新的排盘数据，请查收并简要总述一下该命盘的核心特质。`;
      
      await handleSendMessage(promptToAI, displayContent, payloadStr);
    } catch(e) {
      alert("文本解析失败");
    }
    setChartText('');
    setIsAnalyzing(false);
  };

  const handleGenerateNativeChart = () => {
    if (!nativeDate) { alert("请选择日期"); return; }
    const chartData = generateNativeChart(nativeDate, nativeTime, nativeGender);
    if (!chartData) { alert("排盘失败"); return; }
    
    const pureJsonStr = JSON.stringify(chartData, null, 2);
    setActiveChartText(pureJsonStr); 
    
    const name = `[原生] ${nativeDate} ${nativeTime}`;
    const newCases = [...cases, { id: Date.now().toString(), name, content: pureJsonStr, createdAt: Date.now() }];
    setCases(newCases);
  };

  const handleLoadSelectedCases = async () => {
    if (selectedCaseIds.length === 0) return;

    if (selectedCaseIds.length === 1) {
      const c = cases.find(c => c.id === selectedCaseIds[0]);
      if (c) {
        setActiveChartText(c.content); 
        
        const aiPayload = buildAIPayload(JSON.parse(c.content));
        const payloadStr = JSON.stringify(aiPayload, null, 2);
        
        const displayContent = `🔮 载入命盘：${c.name}`;
        const promptToAI = `我已切换至命盘：${c.name}，请查收。`;
        
        await handleSendMessage(promptToAI, displayContent, payloadStr);
      }
    }
    setIsCaseModalOpen(false);
    setSelectedCaseIds([]);
  };

  // ⏳ 运限精准推算
  const handleCalculateLimit = async () => {
    if (!activeChartText || (selectedDecadeIndex === null && selectedYear === null)) return;
    
    try {
      const chartObj = JSON.parse(activeChartText);
      
      if (!chartObj?.rawParams) {
        alert("⚠️ 该命盘是通过『旧版文本导入』的，缺失经纬度与真太阳时参数，无法启动时空穿梭机！请使用左上角的『原生排盘』功能重新生成命盘。");
        return;
      }

      const astrolabe = astro.bySolar(chartObj.rawParams.birthday, chartObj.rawParams.birthTime, chartObj.rawParams.gender, true, 'zh-CN');
      const horoscope = astrolabe.horoscope(focusDate);
      const decades = astrolabe.palaces.map((p, idx) => ({ ...p.decadal, palaceIndex: idx, name: p.name })).sort((a,b) => a.range[0] - b.range[0]);
      
      let decadeData: DynamicContext | undefined = undefined;
      let yearData: DynamicContext | undefined = undefined;

      if (horoscope.decadal) {
        const d = horoscope.decadal;
        const mapping: Record<string, string> = {};
        (horoscope as any).palaces.forEach((p: any) => { if (p.decadal.name) mapping[p.decadal.name] = p.earthlyBranch; });
        const currentDecade = decades.find(dec => dec.heavenlyStem === d.heavenlyStem && dec.earthlyBranch === d.earthlyBranch);
        decadeData = {
          timeLabel: `第${selectedDecadeIndex !== null ? selectedDecadeIndex + 1 : '?'}大限 (${currentDecade?.range[0]}-${currentDecade?.range[1]}岁)`,
          ganZhi: `${d.heavenlyStem}${d.earthlyBranch}`,
          sihua: SI_HUA_MAP[d.heavenlyStem] || "未知",
          mapping
        };
      }

      if (selectedYear !== null && horoscope.yearly) {
        const y = horoscope.yearly;
        const mapping: Record<string, string> = {};
        (horoscope as any).palaces.forEach((p: any) => { if (p.yearly.name) mapping[p.yearly.name] = p.earthlyBranch; });
        yearData = {
          timeLabel: `${selectedYear}年流年`,
          ganZhi: `${y.heavenlyStem}${y.earthlyBranch}`,
          sihua: SI_HUA_MAP[y.heavenlyStem] || "未知",
          mapping
        };
      }

      const aiPayload = buildAIPayload(astrolabe, decadeData, yearData);
      const payloadStr = JSON.stringify(aiPayload, null, 2);

      const focusTitle = selectedYear !== null ? `${selectedYear}年 流年运势` : decadeData?.timeLabel;
      
      const displayContent = `🔮 发起运限推演\n▶ 目标时空：${focusTitle}\n▶ 模式：三盘叠影全息分析`;
      const promptToAI = `[系统指令：运限精准推算]\n当前用户希望推算的时空节点为：${focusTitle}。请基于附加数据包中的三盘叠影坐标，重点分析该运限的机遇与危机。`;

      await handleSendMessage(promptToAI, displayContent, payloadStr);

    } catch (e) {
      console.error(e);
      alert("推算失败，排盘数据结构异常！");
    }
  };

  const handleClearChat = () => setShowClearConfirm(true);
  const executeClearChat = () => {
    window.localStorage.removeItem('ziwei_chat_messages');
    window.localStorage.removeItem('ziwei_active_chart');
    setMessages([{ id: Date.now().toString(), role: 'ai', content: '你好，我是紫微多维共振引擎。您可以粘贴命盘给我。' }]);
    setActiveChartText('');
    setShowClearConfirm(false);
  };
  const handleSaveChart = () => {
    if (!chartText.trim()) { alert("⚠️ 请先在文本框中粘贴排盘数据！"); return; }
    setTempChartName(""); setShowSavePrompt(true);
  };
  const executeSaveChart = () => {
    if (!tempChartName.trim()) return;
    const finalContent = JSON.stringify(parseWenMoTianJiToJSON(chartText), null, 2);
    const newCases = [...cases, { id: Date.now().toString(), name: tempChartName.trim(), content: finalContent, createdAt: Date.now() }];
    setCases(newCases);
    alert("✅ 保存成功！"); setChartText(''); setShowSavePrompt(false);
  };

  const renderTimeMachine = () => {
    if (!activeChartText) return null;
    try {
      const chartObj = JSON.parse(activeChartText);
      if (!chartObj?.rawParams) return null;

      const astrolabe = astro.bySolar(chartObj.rawParams.birthday, chartObj.rawParams.birthTime, chartObj.rawParams.gender, true, 'zh-CN');
      const decades = astrolabe.palaces.map((p, idx) => ({ ...p.decadal, palaceIndex: idx, name: p.name })).sort((a,b) => a.range[0] - b.range[0]);
      const birthLunarYear = astrolabe.rawDates.lunarDate.lunarYear;
      const currentYear = focusDate.getFullYear();

      return (
        <div className="bg-zinc-950 border-t border-zinc-800 p-2 flex flex-col gap-1.5 animate-in slide-in-from-bottom-4 shrink-0 max-h-[25%] no-scrollbar overflow-y-auto">
          <div className="flex justify-between text-[10px] text-emerald-300 font-mono px-1">
            <span className="flex items-center gap-1">⏳ 时空穿梭机</span>
            <span>推演焦点: {currentYear}年</span>
          </div>
          
          <div className="flex gap-2 items-center">
            <div className="flex-1 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-1 px-1">
              {decades.map((d, idx) => {
                const startYear = birthLunarYear + d.range[0] - 1;
                const isActive = selectedDecadeIndex === idx;
                return (
                  <button key={idx} 
                    onClick={() => { 
                      if (selectedDecadeIndex === idx) { setSelectedDecadeIndex(null); setSelectedYear(null); } 
                      else { setSelectedDecadeIndex(idx); setSelectedYear(null); setFocusDate(new Date(startYear, 6, 1)); }
                    }}
                    className={`px-1 py-1 rounded border text-[10px] flex flex-col items-center transition-all ${isActive ? 'border-emerald-400 bg-emerald-800/40 text-emerald-300' : 'border-zinc-700 text-zinc-300 hover:border-zinc-500 bg-zinc-900'}`}>
                    <div className="font-bold">{d.range[0]}-{d.range[1]}岁</div>
                    <div className="text-[9px] opacity-80">{d.heavenlyStem}{d.earthlyBranch}</div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={handleCalculateLimit}
              disabled={selectedDecadeIndex === null && selectedYear === null}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                (selectedDecadeIndex !== null || selectedYear !== null) ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'bg-zinc-800 text-zinc-500 opacity-50 cursor-not-allowed'
              }`}
            >
              <Zap size={14} /> 精准推算
            </button>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 px-1">
             {(() => {
               if (selectedDecadeIndex === null) return <div className="col-span-full text-center py-2 text-zinc-600 text-[10px]">请先选择大限</div>;
               const d = decades[selectedDecadeIndex];
               return Array.from({length:10}, (_,i) => birthLunarYear + d.range[0] - 1 + i).map(y => {
                 return (
                   <button key={y} onClick={() => { selectedYear === y ? setSelectedYear(null) : (setSelectedYear(y), setFocusDate(new Date(y, 6, 1))); }}
                     className={`h-10 rounded text-[9px] border flex flex-col items-center justify-center leading-tight transition-all ${selectedYear === y ? 'bg-emerald-500 text-white border-emerald-300' : 'bg-zinc-800 text-zinc-200 border-zinc-700'}`}>
                     <div className="font-mono opacity-60 text-[8px]">{y}</div>
                     <div className="font-bold text-[10px]">{getYearGanZhi(y)}</div>
                   </button>
                 );
               });
             })()}
          </div>
        </div>
      );
    } catch (e) { return null; }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-4 h-full w-full overflow-hidden p-4 max-w-[1600px] mx-auto relative">
      <div className="w-full lg:w-[60%] xl:w-[65%] h-full flex-shrink-0 bg-gray-50 dark:bg-gray-900 rounded-lg shadow-inner overflow-hidden flex flex-col border border-zinc-800 relative">
        <div className="bg-zinc-950 border-b border-zinc-800 p-1 flex justify-center">
          <div className="flex bg-zinc-900 rounded-lg p-0.5 w-full max-w-[280px] border border-zinc-800/50">
            <button onClick={() => setLeftPanelView('astrolabe')} className={`flex-1 py-1 text-[10px] ${leftPanelView === 'astrolabe' ? 'bg-[#2d313a] text-emerald-400' : 'text-zinc-500'}`}>命盘视图</button>
            <button onClick={() => setLeftPanelView('score')} className={`flex-1 py-1 text-[10px] ${leftPanelView === 'score' ? 'bg-[#2d313a] text-emerald-400' : 'text-zinc-500'}`}>量化分析</button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
          {leftPanelView === 'astrolabe' ? (
            <>
              <div className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden">
                {activeChartText ? (
                  <ErrorBoundary fallback={<div className="p-8 text-red-500">渲染出错</div>}>
                    <Suspense fallback={<div className="text-emerald-500 p-20"><Loader2 className="animate-spin"/></div>}>
                       {(() => {
                          try {
                            const obj = JSON.parse(activeChartText);
                            if (!obj.rawParams) return <div className="p-10 text-zinc-500 mt-20">文本导入的旧数据不支持互动，请使用原生排盘</div>;
                            return (
                              <div className="transform scale-[0.89]">
                                <Iztrolabe width={1000} birthday={obj.rawParams.birthday} birthTime={obj.rawParams.birthTime} birthdayType={obj.rawParams.birthdayType} gender={obj.rawParams.gender} {...((selectedDecadeIndex !== null || selectedYear !== null) ? { horoscopeDate: `${focusDate.getFullYear()}-${String(focusDate.getMonth() + 1).padStart(2, '0')}-01` } : {})} />
                              </div>
                            );
                          } catch(e) { return <div className="p-10 text-red-500">解析错误</div> }
                       })()}
                    </Suspense>
                  </ErrorBoundary>
                ) : (<div className="text-zinc-500">请在右侧排盘</div>)}
              </div>
              {renderTimeMachine()}
            </>
          ) : (
            <PalaceScoreTable iztroData={activeChartText} />
          )}
        </div>
      </div>

      <div className="w-full lg:w-[40%] xl:w-[35%] flex flex-col flex-1 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden relative">
        <div className="bg-zinc-950/50 border-b border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-6 border-b border-zinc-800 w-full">
              <button onClick={() => setActiveTab('native')} className={`pb-2 text-sm font-medium ${activeTab === 'native' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-zinc-500'}`}>原生排盘</button>
              <button onClick={() => setActiveTab('import')} className={`pb-2 text-sm font-medium ${activeTab === 'import' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-zinc-500'}`}>文本导入</button>
            </div>
            <button onClick={handleClearChat} className="text-xs flex items-center gap-1 text-zinc-500 hover:text-red-400 absolute right-4 top-4"><Trash2 size={12} />清空</button>
          </div>

          {activeTab === 'native' ? (
            <div className="flex gap-3 items-end">
              <div className="flex flex-col gap-1"><label className="text-xs text-zinc-500">性别</label><select value={nativeGender} onChange={e => setNativeGender(e.target.value as '男' | '女')} className="bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-sm text-zinc-300 h-9"><option>男</option><option>女</option></select></div>
              <div className="flex flex-col gap-1 flex-1"><label className="text-xs text-zinc-500">日期</label><input type="date" value={nativeDate} onChange={e => setNativeDate(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-sm text-zinc-300 h-9" /></div>
              <div className="flex flex-col gap-1 flex-1"><label className="text-xs text-zinc-500">时辰</label><select value={nativeTime} onChange={e => setNativeTime(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-sm text-zinc-300 h-9">{['子时','丑时','寅时','卯时','辰时','巳时','午时','未时','申时','酉时','戌时','亥时'].map(t => <option key={t}>{t}</option>)}</select></div>
              <div className="flex gap-1 shrink-0">
                <button onClick={handleGenerateNativeChart} className="px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-medium h-9">生成</button>
                <button onClick={() => setIsCaseModalOpen(true)} className="px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-xs h-9"><FolderOpen size={14} /></button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <textarea value={chartText} onChange={e => setChartText(e.target.value)} placeholder="粘贴纯文本..." className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-zinc-300 resize-none h-16" />
              <div className="flex flex-col gap-1 shrink-0">
                <div className="flex gap-1">
                  <button onClick={handleSaveChart} className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded-md text-xs h-7">保存</button>
                  <button onClick={() => setIsCaseModalOpen(true)} className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded-md text-xs h-7">选盘</button>
                </div>
                <button onClick={handleStartAnalysis} disabled={isAnalyzing || !chartText} className="bg-emerald-600 text-white rounded-md text-xs font-medium h-8 flex items-center justify-center gap-1">{isAnalyzing ? <Loader2 size={12} className="animate-spin"/> : <Play size={12}/>} 解析</button>
              </div>
            </div>
          )}
        </div>

        {activeChartText && (
          <div className="bg-emerald-900/30 px-4 py-1.5 flex items-center gap-2 text-emerald-400 text-xs border-b border-emerald-800/50">
            <span>📌 上下文已锚定</span><button onClick={() => setActiveChartText('')} className="ml-auto hover:text-emerald-300"><X size={14}/></button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-950/30">
          {(messages || []).map(msg => <ChatBubble key={msg.id} message={msg} />)}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-zinc-950/50 border-t border-zinc-800">
          <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
            {['今年财运', '性格格局', '感情缘分', '事业变动'].map(t => (
              <button key={t} onClick={() => handleSendMessage(`请帮我重点推测：${t}`)} className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-[11px] text-zinc-400 hover:text-emerald-400 whitespace-nowrap">{t}</button>
            ))}
          </div>
          <div className="flex gap-3">
            <input type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder="输入追问..." className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-4 text-sm text-zinc-200" />
            <button onClick={() => handleSendMessage()} disabled={!inputValue.trim()} className="w-10 h-10 rounded-full bg-emerald-600 disabled:bg-zinc-800 text-white flex items-center justify-center"><Send size={16} className="ml-1" /></button>
          </div>
        </div>
      </div>

      {isCaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-[500px] shadow-2xl p-5">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-white">选择命盘</h3>
                <button onClick={() => setIsCaseModalOpen(false)}><X className="text-zinc-500 hover:text-white"/></button>
             </div>
             <div className="max-h-64 overflow-y-auto space-y-2">
                {cases.map(c => (
                  <div key={c.id} className="flex items-center gap-3 p-2 border border-zinc-800 rounded hover:bg-zinc-800 cursor-pointer" onClick={() => setSelectedCaseIds([c.id])}>
                    <input type="radio" checked={selectedCaseIds.includes(c.id)} readOnly className="accent-emerald-500" />
                    <span className="text-sm text-zinc-200">{c.name}</span>
                  </div>
                ))}
             </div>
             <button onClick={handleLoadSelectedCases} className="mt-4 w-full bg-emerald-600 text-white py-2 rounded-md">确认加载</button>
          </div>
        </div>
      )}
      {showClearConfirm && (
         <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60"><div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800"><p className="text-white mb-4">确认清空？</p><button onClick={executeClearChat} className="bg-red-600 text-white px-4 py-2 rounded">清空</button></div></div>
      )}
    </div>
  );
}
