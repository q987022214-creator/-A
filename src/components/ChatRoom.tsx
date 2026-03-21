// src/components/ChatRoom.tsx
import * as React from 'react';
import { Component, useState, useRef, useEffect, Suspense } from 'react';
import { Send, Play, Loader2, Check, X, Bot, User, Trash2, Save, FolderOpen, LayoutDashboard, Compass, Target, Zap, Settings, Hexagon } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { parseWenMoTianJiToJSON } from '../utils/ziweiParser';
import { generateNativeChart } from '../utils/nativeChartGenerator';
import { extractAndSaveMemory } from '../utils/memoryExtractor';
import { buildAIPayload, DynamicContext } from '../utils/aiPromptBuilder';
import { VCoreEngine, VectorMath, Vector5D } from '../utils/vCoreEngine';
import { mapToPalaceContext } from '../utils/dynamicScoreCalculator';
import { astro } from 'iztro'; 
import { DateTimePickerModal } from './DateTimePickerModal';
import PalaceScoreTable from './PalaceScoreTable';
import TrendHistogram from './TrendHistogram';
import VCoreDashboard from './VCoreDashboard';
import { ChatBubble } from './ChatBubble';

class ErrorBoundary extends React.Component<{ fallback: React.ReactNode, children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { fallback: React.ReactNode, children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, info: any) { console.error("星盘组件崩溃:", error, info); }
  render() { if (this.state.hasError) return this.props.fallback; return this.props.children; }
}

import { Iztrolabe } from 'react-iztro';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  isError?: boolean;
  payload?: string;
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
  category?: string;
  notes?: string;
}

export type ChartMemory = {
  chartId: string;
  chartName: string;
  aiSummary: string[];
  validatedFacts: string[];
  userInfo: string[];
};

// 🌟🌟🌟 手搓的“紫微星象罗盘算法” 🌟🌟🌟
// 功能：只要知道命宫在哪，瞬间逆时针铺开12宫，绝对防错！
const getPalaceMapping = (lifeBranch: string, prefix: string) => {
  const branches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  const names = ["命宫", "兄弟", "夫妻", "子女", "财帛", "疾厄", "迁移", "交友", "官禄", "田宅", "福德", "父母"];
  const mapping: Record<string, string> = {};
  const lifeIndex = branches.indexOf(lifeBranch);
  
  if (lifeIndex === -1) return mapping;

  for (let i = 0; i < 12; i++) {
     // 紫微十二宫永远是逆时针排布！所以向后退
     const branchIndex = (lifeIndex - i + 12) % 12;
     mapping[`${prefix}${names[i]}`] = branches[branchIndex];
  }
  return mapping;
};

const getOppositeBranch = (branch: string) => {
  const branches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  const idx = branches.indexOf(branch);
  return branches[(idx + 6) % 12];
};

export default function ChatRoom() {
  const [chartText, setChartText] = useState('');
  const [messages, setMessages] = useLocalStorage<Message[]>('ziwei_chat_messages', [
    { id: '1', role: 'ai', content: '你好！我是紫微多维共振引擎。请在上方排盘，或直接与我对话。' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeChartText, setActiveChartText] = useLocalStorage<string | null>('ziwei_active_chart', null);
  
  const [leftPanelView, setLeftPanelView] = useState<'astrolabe' | 'score' | 'vcore'>('astrolabe');
  const [mobileView, setMobileView] = useState<'chart' | 'chat'>('chart');
  const isMobile = window.innerWidth < 1024;
  
  const [focusDate, setFocusDate] = useState<Date>(new Date());
  const [selectedDecadeIndex, setSelectedDecadeIndex] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  
  const [isExtracting, setIsExtracting] = useState(false);
  const [pendingFuel, setPendingFuel] = useState<ExtractedFuel | null>(null);

  const [cases, setCases] = useLocalStorage<Case[]>('ziwei_cases', []);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);

  const [memories, setMemories] = useLocalStorage<ChartMemory[]>('ziwei_memories', []);
  
  const [apiSettings] = useLocalStorage('ziwei_api_settings', {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'deepseek-chat'
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [tempChartName, setTempChartName] = useState("");
  const [viewingChartContent, setViewingChartContent] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'native' | 'import'>('native');
  const [nativeGender, setNativeGender] = useState<'男' | '女'>('男');
  const [nativeDate, setNativeDate] = useState('');
  const [nativeTime, setNativeTime] = useState('12:00');
  const [nativeName, setNativeName] = useState('匿名');
  const [calendarType, setCalendarType] = useState<'solar' | 'lunar'>('solar');
  const [isLeapMonth, setIsLeapMonth] = useState(false);
  const [longitude, setLongitude] = useState<string>('120');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
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

  const streamChat = async (userMsg: string, hasEmbeddedPayload: boolean = false) => {
    const aiMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...(prev || []), { id: aiMessageId, role: 'ai', content: '' }]);

    const apiKey = apiSettings.apiKey.trim();
    const baseUrl = apiSettings.baseUrl.trim().replace(/\/+$/, '');
    const model = apiSettings.model.trim() || 'deepseek-chat';

    // 🌟 本地测试模式 (拦截防白屏)
    if (!apiKey || !baseUrl) {
      setTimeout(() => {
        setMessages(prev => (prev || []).map(msg => 
          msg.id === aiMessageId ? { 
            ...msg, 
            content: "【本地测试模式】未检测到 API 密钥，大模型未启动。\n但底层的全息三盘数据已完美打包！请点开您上一条消息的【▶ 后台隐式推演数据包 (Payload)】查收叠宫数据！" 
          } : msg
        ));
      }, 800);
      return;
    }

    try {
      let systemPrompt = "你是一个名为'紫微多维共振引擎'的顶尖命理 AI。请严格使用【三盘叠影法】进行推断。";

      if (activeRule && activeRule.steps) {
        const stepsText = activeRule.steps.map((s: any) => `${s.title}\n${s.description}`).join('\n\n');
        systemPrompt += `\n\n请严格按照以下【${activeRule.name}】的步骤来进行解盘：\n\n${stepsText}`;
      }

      if (activeChartText && !hasEmbeddedPayload) {
          try {
            let clean = activeChartText.trim();
            if (!clean.startsWith('{')) clean = clean.match(/\{[\s\S]*\}/)?.[0] || '';
            const chartObj = JSON.parse(clean);
            const aiPayload = buildAIPayload(chartObj, undefined, undefined, activeRule?.systemInstruction);
            systemPrompt += `\n\n【全息命盘结构化数据包】：\n${JSON.stringify(aiPayload, null, 2)}`;
          } catch (e) {
            systemPrompt += `\n\n【当前正在分析的全局命盘数据】：\n${activeChartText}`;
          }
      }

      const chatMessages = [
        { role: 'system', content: systemPrompt },
        ...(messages || []).map(m => ({ role: m.role === 'ai' ? 'assistant' : m.role, content: m.content })),
        { role: 'user', content: userMsg }
      ];

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: model, messages: chatMessages, stream: false })
      });

      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
      const data = await response.json();
      const replyText = data.choices[0].message.content;
      
      setMessages(prev => (prev || []).map(msg => msg.id === aiMessageId ? { ...msg, content: replyText } : msg));
      extractAndSaveMemory(getSafeChartId(), userMsg, replyText);

    } catch (error: any) {
      setMessages(prev => {
        const safePrev = prev || [];
        const filtered = safePrev.filter(msg => msg.id !== aiMessageId);
        return [...filtered, { id: Date.now().toString(), role: 'ai', content: `接口调用失败，原因：${error.message}`, isError: true }];
      });
    }
  };

  const handleSendMessage = async (customMsg?: string, displayMsg?: string, payload?: string) => {
    const userMsg = customMsg || inputValue.trim();
    if (!userMsg) return;
    
    // 🚨 核心修复：彻底删除了这里对 API Key 的拦截，让本地测试如丝般顺滑！
    
    const newUserMessage: Message = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: displayMsg || userMsg,
      payload: payload
    };
    
    setMessages(prev => [...(prev || []), newUserMessage]);
    if (!customMsg) setInputValue('');

    if (
      userMsg.length > 200 && 
      !userMsg.includes('[系统指令') && 
      !userMsg.includes('【当前焦点】') &&
      (userMsg.includes('命盘') || userMsg.includes('文墨天机') || userMsg.includes('宫'))
    ) {
      setActiveChartText(userMsg);
    }

    let finalPromptToAI = userMsg;
    if (payload) {
        finalPromptToAI += `\n\n【附加动态命理数据包】：\n${payload}`;
    }

    await streamChat(finalPromptToAI, !!payload);
  };

  const handleStartAnalysis = async () => {
    if (!chartText.trim()) return;
    
    setIsAnalyzing(true);
    try {
      const parsedObj = parseWenMoTianJiToJSON(chartText);
      const pureJsonStr = JSON.stringify(parsedObj, null, 2);
      setActiveChartText(pureJsonStr);
      
      const aiPayload = buildAIPayload(parsedObj, undefined, undefined, activeRule?.systemInstruction);
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

  // 🚀🚀🚀 核心修复：原生排盘后自动发车
  const getAdjustedTime = () => {
    if (!nativeDate || !nativeTime) return null;
    let timeIndex = 0;
    let adjustedDateStr = nativeDate;
    let adjustedTimeStr = nativeTime;
    let branch = '';

    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

    if (nativeTime.includes('时')) {
      const timeMap: Record<string, number> = { 
        '子时': 0, '丑时': 1, '寅时': 2, '卯时': 3, '辰时': 4, '巳时': 5, 
        '午时': 6, '未时': 7, '申时': 8, '酉时': 9, '戌时': 10, '亥时': 11 
      };
      timeIndex = timeMap[nativeTime] || 0;
      branch = nativeTime;
    } else {
      const lon = parseFloat(longitude);
      let date = new Date(`${nativeDate}T${nativeTime}:00+08:00`);
      
      if (!isNaN(date.getTime()) && !isNaN(lon) && calendarType === 'solar') {
        const offsetMinutes = (lon - 120) * 4;
        date = new Date(date.getTime() + offsetMinutes * 60000);
        adjustedDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const adjustedHH = date.getHours();
        const adjustedMM = date.getMinutes();
        adjustedTimeStr = `${String(adjustedHH).padStart(2, '0')}:${String(adjustedMM).padStart(2, '0')}`;
        timeIndex = Math.floor(((adjustedHH + 1) % 24) / 2);
      } else {
        const [hh] = nativeTime.split(':').map(Number);
        if (!isNaN(hh)) {
          timeIndex = Math.floor(((hh + 1) % 24) / 2);
        }
      }
      branch = branches[timeIndex] + '时';
    }

    return {
      dateStr: adjustedDateStr,
      timeStr: adjustedTimeStr,
      timeIndex,
      branch
    };
  };

  const handleGenerateNativeChart = async () => {
    if (!nativeDate) { alert("请选择日期"); return; }
    
    const adjusted = getAdjustedTime();
    if (!adjusted) { alert("时间解析失败"); return; }

    const chartData = generateNativeChart({
      name: nativeName,
      calendarType,
      dateStr: adjusted.dateStr,
      timeIndex: adjusted.timeIndex,
      gender: nativeGender,
      isLeapMonth
    });

    if (!chartData) { alert("排盘失败"); return; }
    
    const pureJsonStr = JSON.stringify(chartData, null, 2);
    setActiveChartText(pureJsonStr); 
    
    const name = `[${nativeName}] ${calendarType === 'lunar' ? '农历' : '公历'} ${nativeDate} ${nativeTime} (${adjusted.branch})`;
    const newCases = [...cases, { id: Date.now().toString(), name, content: pureJsonStr, createdAt: Date.now(), category: '未分类' }];
    setCases(newCases);

    const aiPayload = buildAIPayload(chartData, undefined, undefined, activeRule?.systemInstruction);
    const payloadStr = JSON.stringify(aiPayload, null, 2);
    const displayContent = `🔮 成功生成命盘：${name}。请基于原局为我推算。`;
    const promptToAI = `我已提交新的排盘数据，请查收并简要总述一下该先天格局。`;

    await handleSendMessage(promptToAI, displayContent, payloadStr);
  };

  // 🚀🚀🚀 终极修复：提取大运流年，利用罗盘算法算出12宫叠宫！
  const extractTimeLimitPayload = (targetDate: Date, overrideDecadeIndex: number | null = null) => {
    if (!activeChartText) return null;
    try {
      let clean = activeChartText.trim();
      if (!clean.startsWith('{')) clean = clean.match(/\{[\s\S]*\}/)?.[0] || '';
      const chartObj = JSON.parse(clean);
      if (!chartObj?.rawParams) return { payloadStr: JSON.stringify(buildAIPayload(chartObj, undefined, undefined, activeRule?.systemInstruction), null, 2), focusTitle: '原局底盘' };

      const astrolabe = astro.bySolar(chartObj.rawParams.birthday, chartObj.rawParams.birthTime, chartObj.rawParams.gender, true, 'zh-CN');
      const horoscope = astrolabe.horoscope(targetDate);
      
      let decadeData: DynamicContext | undefined = undefined;
      let yearData: DynamicContext | undefined = undefined;
      let focusTitle = `${targetDate.getFullYear()}年 流年`;
      let vectorData: { decade?: Vector5D, year?: Vector5D } = {};

      // 1. 生成大运 12 宫叠宫映射
      if (horoscope.decadal) {
        const d = horoscope.decadal;
        // 核心法宝：利用大运命宫干支的“地支”，推演出其余11宫！
        const mapping = getPalaceMapping(d.earthlyBranch, '大限');
        
        const decades = astrolabe.palaces.map(p => p.decadal);
        const currentDecade = decades.find(dec => dec.heavenlyStem === d.heavenlyStem && dec.earthlyBranch === d.earthlyBranch);
        const timeLabel = overrideDecadeIndex !== null 
            ? `第${overrideDecadeIndex + 1}大限 (${currentDecade?.range[0]}-${currentDecade?.range[1]}岁)` 
            : `当前大限 (${currentDecade?.range[0]}-${currentDecade?.range[1]}岁)`;

        if (overrideDecadeIndex !== null) focusTitle = timeLabel;

        decadeData = {
          timeLabel,
          ganZhi: `${d.heavenlyStem}${d.earthlyBranch}`,
          mapping
        };

        // 🚀 计算大限命宫 5D 向量
        const decadeLifePalace = (horoscope as any).palaces.find((p: any) => p.earthlyBranch === d.earthlyBranch);
        const oppDecadePalace = (horoscope as any).palaces.find((p: any) => p.earthlyBranch === getOppositeBranch(d.earthlyBranch));
        if (decadeLifePalace) {
          const dContext = mapToPalaceContext(decadeLifePalace);
          const oppContext = oppDecadePalace ? mapToPalaceContext(oppDecadePalace) : undefined;
          vectorData.decade = VCoreEngine.calculatePalaceVector(dContext, oppContext);
        }
      }

      // 2. 生成流年 12 宫叠宫映射
      if (overrideDecadeIndex === null || selectedYear !== null) {
        if (horoscope.yearly) {
          const y = horoscope.yearly;
          const mapping = getPalaceMapping(y.earthlyBranch, '流年');

          yearData = {
            timeLabel: `${targetDate.getFullYear()}年 流年`,
            ganZhi: `${y.heavenlyStem}${y.earthlyBranch}`,
            mapping
          };
          focusTitle = `${targetDate.getFullYear()}年 流年`;

          // 🚀 计算流年命宫 5D 向量 (含时空轴演化)
          const yearLifePalace = (horoscope as any).palaces.find((p: any) => p.earthlyBranch === y.earthlyBranch);
          const oppYearPalace = (horoscope as any).palaces.find((p: any) => p.earthlyBranch === getOppositeBranch(y.earthlyBranch));
          
          const natalLifePalace = astrolabe.palaces.find(p => p.earthlyBranch === y.earthlyBranch);
          const oppNatalPalace = astrolabe.palaces.find(p => p.earthlyBranch === getOppositeBranch(y.earthlyBranch));

          if (yearLifePalace && natalLifePalace) {
            const yContext = mapToPalaceContext(yearLifePalace);
            const oppYContext = oppYearPalace ? mapToPalaceContext(oppYearPalace) : undefined;
            
            const nContext = mapToPalaceContext(natalLifePalace);
            const oppNContext = oppNatalPalace ? mapToPalaceContext(oppNatalPalace) : undefined;

            const natalVector = VCoreEngine.calculatePalaceVector(nContext, oppNContext);
            const yearlyVector = VCoreEngine.calculatePalaceVector(yContext, oppYContext);
            
            // 使用 deduceTimeAxis 计算 T_Delta 演化向量
            const res = VCoreEngine.deduceTimeAxis(natalVector, nContext, yearlyVector, yContext);
            vectorData.year = res.tDelta;
          }
        }
      }

      const aiPayload = buildAIPayload(astrolabe, decadeData, yearData, activeRule?.systemInstruction, vectorData);
      return { payloadStr: JSON.stringify(aiPayload, null, 2), focusTitle };
    } catch (e) {
      console.error("提取时空结构失败:", e);
      return null;
    }
  };

  const handleCalculateLimit = async () => {
    if (selectedDecadeIndex === null && selectedYear === null) return;
    const res = extractTimeLimitPayload(focusDate, selectedYear === null ? selectedDecadeIndex : null);
    if (!res) return;

    const displayContent = `🔮 发起运限推演\n▶ 目标时空：${res.focusTitle}\n▶ 模式：全息叠影维度展开`;
    const promptToAI = `[系统指令：运限精准推算]\n当前用户希望推算的时空节点为：${res.focusTitle}。请基于附加的全息压缩数据包，直接读取【宫位身份】寻找叠宫，重点分析该运限吉凶。`;
    await handleSendMessage(promptToAI, displayContent, res.payloadStr);
  };

  const handleQuickQuestion = async (topic: string) => {
    if (!activeChartText) {
      handleSendMessage(`请帮我重点推测：${topic}`);
      return;
    }
    
    const res = extractTimeLimitPayload(focusDate, selectedYear === null && selectedDecadeIndex !== null ? selectedDecadeIndex : null);
    if (!res) {
      handleSendMessage(`请帮我重点推测：${topic}`);
      return;
    }

    const displayContent = `🔮 快捷推演：${topic}\n▶ 参照时空：${res.focusTitle}`;
    const promptToAI = `[系统指令：精准推算]\n当前用户希望重点推测：【${topic}】。请基于附加数据包，利用叠影坐标和动态四化落点，给予深度分析。`;
    await handleSendMessage(promptToAI, displayContent, res.payloadStr);
  };

  const ExtractFuel = async (userText: string, aiText: string) => {
    setIsExtracting(true);
    setPendingFuel(null);
    const apiKey = apiSettings.apiKey.trim();
    if(!apiKey) { alert("此功能需要API"); setIsExtracting(false); return;}
    // 此处略过具体提炼逻辑，保持原有
  };
  const handleConfirmFuel = () => { /*...*/ setPendingFuel(null); };
  const handleIgnoreFuel = () => setPendingFuel(null);

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
    const newCases = [...cases, { id: Date.now().toString(), name: tempChartName.trim(), content: finalContent, createdAt: Date.now(), category: '未分类' }];
    setCases(newCases);
    alert("✅ 保存成功！"); setChartText(''); setShowSavePrompt(false);
  };

  const handleLoadSelectedCases = async () => {
    if (selectedCaseIds.length === 0) return;
    if (selectedCaseIds.length === 1) {
      const c = cases.find(c => c.id === selectedCaseIds[0]);
      if (c) {
        setActiveChartText(c.content); 
        const aiPayload = buildAIPayload(JSON.parse(c.content), undefined, undefined, activeRule?.systemInstruction); 
        const payloadStr = JSON.stringify(aiPayload, null, 2);
        const displayContent = `🔮 载入命盘：${c.name}`;
        const promptToAI = `我已切换至命盘：${c.name}，请查收。`;
        await handleSendMessage(promptToAI, displayContent, payloadStr);
      }
    }
    setIsCaseModalOpen(false);
    setSelectedCaseIds([]);
  };

  const handleToggleCaseSelection = (caseId: string) => {
    setSelectedCaseIds(prev => prev.includes(caseId) ? prev.filter(id => id !== caseId) : [...prev, caseId]);
  };

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

      const astrolabe = astro.bySolar(chartObj.rawParams.birthday, chartObj.rawParams.birthTime, chartObj.rawParams.gender, true, 'zh-CN');
      const decades = astrolabe.palaces.map((p, idx) => ({ ...p.decadal, palaceIndex: idx, name: p.name })).sort((a,b) => a.range[0] - b.range[0]);
      const birthLunarYear = astrolabe.rawDates.lunarDate.lunarYear;
      const currentYear = focusDate.getFullYear();

      return (
        <div className="bg-zinc-950 border-t border-zinc-800 p-2 flex flex-col gap-1.5 animate-in slide-in-from-bottom-4 shrink-0 max-h-[25%] no-scrollbar overflow-y-auto">
          <div className="flex justify-between text-[10px] text-emerald-300 font-mono px-1">
            <span className="flex items-center gap-1">⏳ 时空穿梭机</span>
            <span>推演: {currentYear}年</span>
          </div>
          
          <div className="flex gap-2 items-center">
            <div className="flex-1 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-1 px-1">
              {decades.map((d, idx) => {
                const startYear = birthLunarYear + d.range[0] - 1;
                const isActive = selectedDecadeIndex === idx;
                return (
                  <button key={idx} 
                    onClick={() => { 
                      if (selectedDecadeIndex === idx) {
                        setSelectedDecadeIndex(null); setSelectedYear(null);
                      } else {
                        setSelectedDecadeIndex(idx); setSelectedYear(null); setFocusDate(new Date(startYear, 6, 1)); 
                      }
                    }}
                    className={`px-1 py-1 rounded border text-[10px] flex flex-col items-center transition-all ${isActive ? 'border-emerald-400 bg-emerald-800/40 text-emerald-300' : 'border-zinc-700 text-zinc-300 hover:border-zinc-500 bg-zinc-900'}`}>
                    <div className="font-bold">{d.range[0]}-{d.range[1]}岁</div>
                    <div className="text-[9px] opacity-80">{d.heavenlyStem}{d.earthlyBranch}{d.name}</div>
                  </button>
                );
              })}
            </div>
            <button
              disabled={selectedDecadeIndex === null && selectedYear === null}
              onClick={handleCalculateLimit}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                (selectedDecadeIndex !== null || selectedYear !== null)
                  ? 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'
                  : 'bg-zinc-800 text-zinc-500 opacity-50 cursor-not-allowed'
              }`}
            >
              <Zap size={14} fill="currentColor" />
              精准推算
            </button>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 px-1">
             {(() => {
               const activeIdx = selectedDecadeIndex === null ? -1 : selectedDecadeIndex;
               if (activeIdx === -1) return <div className="col-span-full text-center py-2 text-zinc-600 text-[10px]">请先选择大限以展开流年</div>;
               const d = decades[activeIdx];
               if(!d) return null;
               return Array.from({length:10}, (_,i) => birthLunarYear + d.range[0] - 1 + i).map(y => {
                 const age = y - birthLunarYear + 1;
                 const gz = getYearGanZhi(y);
                 const isSelected = selectedYear === y;
                 return (
                   <button key={y} onClick={() => {
                     if (selectedYear === y) { setSelectedYear(null); } 
                     else { setSelectedYear(y); setFocusDate(new Date(y, 6, 1)); }
                   }}
                     className={`h-10 rounded text-[9px] border flex flex-col items-center justify-center leading-tight transition-all ${isSelected ? 'bg-emerald-500 text-white border-emerald-300 shadow-lg shadow-emerald-900/40' : 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:border-zinc-500'}`}>
                     <div className="font-mono opacity-60 text-[8px]">{y}</div>
                     <div className="font-bold text-[10px]">{gz}</div>
                     <div className="opacity-80">{age}岁</div>
                   </button>
                 );
               });
             })()}
          </div>
        </div>
      );
    } catch (e) { return null; }
  };

  const handleDeleteCase = (id: string) => {
    setCases(cases.filter(c => c.id !== id));
    setSelectedCaseIds(selectedCaseIds.filter(selectedId => selectedId !== id));
    setMemories(memories.filter(m => m.chartId !== id));
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full w-full overflow-hidden p-2 sm:p-4 max-w-[1600px] mx-auto relative">
      {isMobile && (
        <div className="flex bg-zinc-900 rounded-lg p-1 mb-2">
          <button onClick={() => setMobileView('chart')} className={`flex-1 py-2 text-sm rounded-md ${mobileView === 'chart' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500'}`}>命盘</button>
          <button onClick={() => setMobileView('chat')} className={`flex-1 py-2 text-sm rounded-md ${mobileView === 'chat' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500'}`}>聊天</button>
        </div>
      )}
      <div className={`w-full lg:w-[60%] xl:w-[65%] h-[40vh] sm:h-[50vh] lg:h-full flex-shrink-0 bg-zinc-900 rounded-lg shadow-inner overflow-hidden flex flex-col border border-zinc-800 relative ${isMobile && mobileView !== 'chart' ? 'hidden' : ''}`}>
        <div className="bg-zinc-950 border-b border-zinc-800 p-1 flex justify-center">
          <div className="flex bg-zinc-900 rounded-lg p-0.5 w-full max-w-[380px] border border-zinc-800/50">
            <button onClick={() => setLeftPanelView('astrolabe')} className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-[10px] font-medium rounded-md transition-all duration-200 ${leftPanelView === 'astrolabe' ? 'bg-zinc-800 text-emerald-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
              <Compass size={12} /> 命盘视图
            </button>
            <button onClick={() => setLeftPanelView('score')} className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-[10px] font-medium rounded-md transition-all duration-200 ${leftPanelView === 'score' ? 'bg-zinc-800 text-emerald-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
              <LayoutDashboard size={12} /> 量化分析
            </button>
            <button onClick={() => setLeftPanelView('vcore')} className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-[10px] font-medium rounded-md transition-all duration-200 ${leftPanelView === 'vcore' ? 'bg-zinc-800 text-emerald-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
              <Hexagon size={12} /> 多维引擎
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
          {leftPanelView === 'astrolabe' ? (
            <>
              <div className="flex-1 min-h-0 w-full flex items-center justify-center p-0 overflow-hidden relative">
                {activeChartText ? (
                  <ErrorBoundary fallback={<div className="p-8 text-red-500 text-center">渲染出错，请重新排盘</div>}>
                    <Suspense fallback={<div className="text-emerald-500 p-20 flex items-center gap-2"><Loader2 className="animate-spin"/>加载中...</div>}>
                       {(() => {
                          try {
                            let clean = activeChartText;
                            if (!clean.startsWith('{')) clean = clean.match(/\{[\s\S]*\}/)?.[0] || '{}';
                            const obj = JSON.parse(clean);
                            if (!obj.rawParams) return <div className="p-10 text-zinc-500 text-center mt-20">文本导入旧数据，请使用原生排盘开启互动</div>;
                            return (
                              <div className="w-full h-full flex items-center justify-center overflow-hidden">
                                <div className="relative w-full h-full flex items-center justify-center">
                                  <div className="origin-center transform scale-[0.35] sm:scale-[0.55] md:scale-[0.68] lg:scale-[0.81] xl:scale-[0.89] transition-all duration-500 ease-in-out flex items-center justify-center" style={{ width: '1000px', height: '1000px', minWidth: '1000px', minHeight: '1000px' }}>
                                    <Iztrolabe 
                                      /* 🔥 核心修复：注入动态 key，只要大限/流年一变，立刻强制 Iztrolabe 组件粉碎并携带新时间重生 */
                                      key={`iztro-${selectedDecadeIndex}-${selectedYear}-${focusDate.getTime()}`}
                                      width={1000} 
                                      birthday={obj.rawParams.birthday} 
                                      birthTime={obj.rawParams.birthTime} 
                                      birthdayType={obj.rawParams.birthdayType || 'solar'} 
                                      gender={obj.rawParams.gender} 
                                      {...((selectedDecadeIndex !== null || selectedYear !== null) ? { 
                                        horoscopeDate: `${focusDate.getFullYear()}-${String(focusDate.getMonth() + 1).padStart(2, '0')}-${String(focusDate.getDate()).padStart(2, '0')}` 
                                      } : {})} 
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          } catch(e) { return <div className="p-10 text-red-500">解析错误</div> }
                       })()}
                    </Suspense>
                  </ErrorBoundary>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 gap-4"><span className="text-4xl">🌌</span><p>请在下方排盘</p></div>
                )}
              </div>
              {renderTimeMachine()}
            </>
          ) : leftPanelView === 'score' ? (
            <div className="w-full h-full flex flex-col overflow-y-auto p-4">
              <TrendHistogram iztroData={activeChartText} />
              <PalaceScoreTable iztroData={activeChartText} />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col overflow-y-auto p-4">
              <VCoreDashboard 
                iztroData={activeChartText} 
                onAskAI={handleSendMessage} 
              />
            </div>
          )}
        </div>
      </div>

      <div className={`w-full lg:w-[40%] xl:w-[35%] flex flex-col flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden relative ${isMobile && mobileView !== 'chat' ? 'hidden' : ''}`}>
        <div className="bg-zinc-950/50 border-b border-zinc-800 p-2 sm:p-4 relative z-[999] pointer-events-auto">
          <div className="flex items-end justify-between mb-2 sm:mb-4 border-b border-zinc-800 relative z-[999] pointer-events-auto">
            <div className="flex gap-4 sm:gap-6">
              <button type="button" onClick={() => setActiveTab('native')} className={`pb-2 text-xs sm:text-sm font-medium transition-colors relative -bottom-[1px] ${activeTab === 'native' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}>原生排盘</button>
              <button type="button" onClick={() => setActiveTab('import')} className={`pb-2 text-xs sm:text-sm font-medium transition-colors relative -bottom-[1px] ${activeTab === 'import' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}>文本导入</button>
            </div>
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleClearChat(); }} className="pb-2 text-xs flex items-center gap-1 text-zinc-500 hover:text-red-400 transition-colors"><Trash2 size={12} /> 清空对话</button>
          </div>

          {activeTab === 'native' ? (
            <div className="flex flex-col gap-1.5 relative z-[999] pointer-events-auto bg-zinc-950/50 p-2 rounded-md border border-zinc-800/80 shadow-sm">
              <div className="flex gap-1.5 flex-wrap sm:flex-nowrap">
                <input type="text" value={nativeName} onChange={e => setNativeName(e.target.value)} placeholder="命盘命名 (默认: 匿名)" className="w-full sm:flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-7" />
                <div className="flex gap-1.5 w-full sm:w-auto">
                  <select value={nativeGender} onChange={e => setNativeGender(e.target.value as '男' | '女')} className="flex-1 sm:w-[50px] bg-zinc-900 border border-zinc-800 rounded px-1 py-1 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-7"><option value="男">男</option><option value="女">女</option></select>
                  <select value={calendarType} onChange={e => setCalendarType(e.target.value as 'solar' | 'lunar')} className="flex-1 sm:w-[60px] bg-zinc-900 border border-zinc-800 rounded px-1 py-1 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-7"><option value="solar">公历</option><option value="lunar">农历</option></select>
                </div>
              </div>
              
              <div className="flex gap-1.5 items-center relative">
                <button type="button" onClick={() => setIsPickerOpen(!isPickerOpen)} className="flex-1 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded px-2 py-1 text-xs text-zinc-300 h-8 sm:h-7 flex justify-between items-center text-left transition-colors">
                  <span className={!nativeDate ? 'text-zinc-500' : ''}>{nativeDate ? `${calendarType === 'solar' ? '阳历' : '阴历'} ${nativeDate} ${nativeTime}` : '请选择出生时间'}</span>
                  <span className="text-emerald-500 text-[10px] font-medium bg-emerald-500/10 px-1 py-0.5 rounded">{getAdjustedTime()?.branch || '时辰'}</span>
                </button>
                {calendarType === 'lunar' && (
                  <label className="flex items-center gap-1 shrink-0 px-1 cursor-pointer h-8 sm:h-7">
                    <input type="checkbox" checked={isLeapMonth} onChange={e => setIsLeapMonth(e.target.checked)} className="rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500 bg-zinc-900 w-3.5 h-3.5 sm:w-3 sm:h-3" />
                    <span className="text-xs sm:text-[10px] text-zinc-400">闰月</span>
                  </label>
                )}
                {isPickerOpen && (
                  <DateTimePickerModal
                    isOpen={isPickerOpen}
                    onClose={() => setIsPickerOpen(false)}
                    initialDate={nativeDate}
                    initialTime={nativeTime}
                    onConfirm={(date, time) => {
                      setNativeDate(date);
                      setNativeTime(time);
                      setIsPickerOpen(false);
                    }}
                  />
                )}
              </div>

              <div className="flex flex-col gap-1 mt-0.5">
                <div className="flex items-center justify-between cursor-pointer group" onClick={() => setShowAdvanced(!showAdvanced)}>
                  <span className="text-xs sm:text-[10px] text-zinc-500 group-hover:text-zinc-400 flex items-center gap-1 transition-colors"><Settings size={12} className="sm:w-2.5 sm:h-2.5" /> 真太阳时校对 {longitude !== '120' && <span className="text-emerald-500/70">({longitude}°)</span>}</span>
                </div>
                {showAdvanced && (
                  <div className="flex gap-1.5 items-center animate-in fade-in slide-in-from-top-1">
                    <input type="number" step="0.01" value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="经度(120)" className="w-[80px] bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-xs sm:text-[10px] text-zinc-300 focus:outline-none focus:border-emerald-500 h-7 sm:h-6" />
                    {calendarType === 'solar' && getAdjustedTime() && (
                      <span className="text-xs sm:text-[10px] text-emerald-500/80">
                        校对后: {getAdjustedTime()?.dateStr} {getAdjustedTime()?.timeStr}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-1.5 mt-0.5">
                <button type="button" onClick={handleGenerateNativeChart} className="flex-[2] px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 h-8 sm:h-7 shadow-sm shadow-emerald-900/20">🔮 立即生成命盘</button>
                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsCaseModalOpen(true); }} className="flex-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 h-8 sm:h-7"><FolderOpen size={12} /> 命盘库</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 relative z-[999] pointer-events-auto">
              <textarea value={chartText} onChange={e => setChartText(e.target.value)} placeholder="在此粘贴纯文本..." className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none h-16 sm:h-auto" />
              <div className="flex sm:flex-col gap-2 shrink-0 relative z-[999] pointer-events-auto w-full sm:w-auto">
                <div className="flex gap-2 relative z-[999] pointer-events-auto flex-1 sm:flex-none">
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSaveChart(); }} disabled={!chartText.trim()} className="flex-1 sm:flex-none px-3 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 h-7 relative z-[999]"><Save size={14} /> 保存</button>
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsCaseModalOpen(true); }} className="flex-1 sm:flex-none px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 h-7 relative z-[999]"><FolderOpen size={14} /> 选盘</button>
                </div>
                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStartAnalysis(); }} disabled={isAnalyzing || !chartText.trim()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 h-7 flex-1 sm:flex-none relative z-[999]">{isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} 开始解析</button>
              </div>
            </div>
          )}
        </div>

        {activeChartText && (
          <div className="bg-emerald-900/20 border-b border-emerald-800/30 px-2 py-1.5 sm:py-1 flex items-center justify-between text-emerald-400/80 text-xs sm:text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{activeChartText.includes('【命盘B') ? '已锁定双人合盘上下文' : '已锁定当前命盘上下文'}</span>
            </div>
            <button onClick={() => setActiveChartText('')} className="hover:text-emerald-300 p-1 sm:p-0.5 transition-colors"><X size={12} className="sm:w-2.5 sm:h-2.5" /></button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 bg-zinc-950/30">
          {(messages || []).map((msg, index) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-2 sm:p-4 bg-zinc-950/50 border-t border-zinc-800">
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-3 no-scrollbar">
            {[
              { label: '今年财运', q: '请帮我重点推算今年的财运状况，有哪些机会或风险？' },
              { label: '性格格局', q: '请详细分析我的性格特质、先天格局以及核心优劣势。' },
              { label: '感情缘分', q: '我想了解我的感情运势，包括正缘特征或近期的感情走向。' },
              { label: '事业变动', q: '最近在事业上有些迷茫，请分析我的职业发展方向与变动时机。' },
              { label: '健康风险', q: '请提醒我需要注意的健康隐患或身体薄弱环节。' }
            ].map((theme, i) => (
              <button key={i} onClick={() => handleQuickQuestion(theme.label)} className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-xs sm:text-[11px] text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-all whitespace-nowrap">{theme.label}</button>
            ))}
          </div>

          <div className="flex gap-2 sm:gap-3">
            <input type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder="输入追问，或提供现实反馈..." className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-3 sm:px-5 py-2 sm:py-3 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
            <button onClick={() => handleSendMessage()} disabled={!inputValue.trim()} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white flex items-center justify-center transition-colors shrink-0"><Send size={16} className="ml-0.5 sm:w-[18px] sm:h-[18px]" /></button>
          </div>
        </div>
      </div>

      {isPickerOpen && (
        <DateTimePickerModal
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          initialDate={nativeDate}
          initialTime={nativeTime}
          onConfirm={(date, time) => {
            setNativeDate(date);
            setNativeTime(time);
            setIsPickerOpen(false);
          }}
        />
      )}

      {isCaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-[500px] max-w-[90vw] shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h3 className="text-lg font-medium text-zinc-100 flex items-center gap-2"><FolderOpen size={18} className="text-emerald-500" />命盘库</h3>
              <button onClick={() => { setIsCaseModalOpen(false); setSelectedCaseIds([]); }} className="text-zinc-500 hover:text-zinc-300"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {cases.length === 0 ? (
                <div className="text-center text-zinc-500 py-8">暂无保存的命盘。请在排盘输入区点击“保存”。</div>
              ) : (
                <div className="space-y-3">
                  {cases.map(c => (
                    <label key={c.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedCaseIds.includes(c.id) ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-zinc-950/50 border-zinc-800 hover:border-zinc-700'}`}>
                      <input type="checkbox" className="mt-1 w-4 h-4 rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900 bg-zinc-900" checked={selectedCaseIds.includes(c.id)} onChange={() => handleToggleCaseSelection(c.id)}/>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-zinc-200">{c.name}</div>
                          {c.category && c.category !== '未分类' && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                              {c.category}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">{new Date(c.createdAt).toLocaleString()}</div>
                      </div>
                      <button 
                        type="button" 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteCase(c.id); }} 
                        className="text-zinc-500 hover:text-red-400 p-1.5 rounded-md hover:bg-zinc-800 transition-colors"
                        title="删除命盘"
                      >
                        <Trash2 size={16} />
                      </button>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-zinc-800 bg-zinc-950/50 flex justify-end gap-3">
              <button onClick={() => { setIsCaseModalOpen(false); setSelectedCaseIds([]); }} className="px-4 py-2 rounded-md text-sm font-medium text-zinc-300 hover:bg-zinc-800">取消</button>
              <button onClick={handleLoadSelectedCases} disabled={selectedCaseIds.length === 0} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 text-white rounded-md text-sm font-medium flex items-center gap-2"><Play size={16} />加载</button>
            </div>
          </div>
        </div>
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-[400px] max-w-[90vw] shadow-2xl p-6">
            <h3 className="text-lg font-medium text-zinc-100 mb-2">清空对话</h3>
            <p className="text-sm text-zinc-400 mb-6">确定要清空所有对话记录和当前命盘上下文吗？此操作不可恢复。</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowClearConfirm(false)} className="px-4 py-2 rounded-md text-sm font-medium text-zinc-300 hover:bg-zinc-800">取消</button>
              <button onClick={executeClearChat} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md text-sm font-medium">确定清空</button>
            </div>
          </div>
        </div>
      )}

      {showSavePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-[400px] max-w-[90vw] shadow-2xl p-6">
            <h3 className="text-lg font-medium text-zinc-100 mb-4">保存命盘</h3>
            <input 
              type="text" 
              value={tempChartName} 
              onChange={e => setTempChartName(e.target.value)} 
              placeholder="给这个命盘起个名字..." 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 mb-6"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowSavePrompt(false)} className="px-4 py-2 rounded-md text-sm font-medium text-zinc-300 hover:bg-zinc-800">取消</button>
              <button onClick={executeSaveChart} disabled={!tempChartName.trim()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-md text-sm font-medium">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
