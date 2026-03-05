import React, { useState } from 'react';
import { Play, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';

export default function Sandbox() {
  const [chartText, setChartText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Read current configurations from local storage
  const [fuels] = useLocalStorage<any[]>('ziwei_fuels', []);
  const [rules] = useLocalStorage<string>('ziwei_rules', '{}');
  const [weights] = useLocalStorage<any>('ziwei_weights', {
    mainStar: 60, siHua: 20, minorStar: 20, globalCoefficient: 0.5
  });

  const handleExecute = () => {
    if (!chartText.trim()) return;
    
    setIsExecuting(true);
    setResult(null);

    // Mock execution delay to simulate AI processing
    setTimeout(() => {
      
      // Parse rules
      let parsedRules = [];
      try {
        parsedRules = JSON.parse(rules).rules || [];
      } catch (e) {}

      // Mock result generation based on current config
      const mockResult = {
        triggeredFuels: fuels.slice(0, 2), // Just take first two for demo
        hitRules: parsedRules.map((r: any) => r.name).slice(0, 2),
        resonanceScore: Math.floor(Math.random() * 30) + 60 + (weights.globalCoefficient * 10),
        aiScript: `根据排盘显示，当前大限交友宫贪狼化忌，结合流年煞星冲动，属于典型的“极度消耗精力的无效社交”格局。\n\n【同气分析】\n主星影响 (${weights.mainStar}%) 叠加四化 (${weights.siHua}%)，全局底色系数 ${weights.globalCoefficient} 放大此格局。\n\n【建议】\n今年在人际交往上保持距离，避免合伙投资，以免破财。`
      };

      setResult(mockResult);
      setIsExecuting(false);
    }, 1500);
  };

  const clearSandbox = () => {
    setChartText('');
    setResult(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-100 tracking-tight">沙盒调试区 (Sandbox Test)</h2>
          <p className="text-sm text-zinc-400 mt-1">每次修改完燃料、规则或权重后，立马在这里跑一个盘验证效果。</p>
        </div>
        <button 
          onClick={clearSandbox}
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          <RefreshCw size={16} />
          清空重置
        </button>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        
        {/* Left: Input Area */}
        <div className="w-[45%] flex flex-col bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="bg-zinc-950/50 border-b border-zinc-800 px-4 py-3">
            <h3 className="text-sm font-medium text-zinc-200 uppercase tracking-wider">排盘输入区</h3>
            <p className="text-xs text-zinc-500 mt-1">粘贴“文墨天机”的排盘纯文本</p>
          </div>
          <textarea
            value={chartText}
            onChange={(e) => setChartText(e.target.value)}
            placeholder="在此粘贴排盘纯文本数据..."
            className="flex-1 w-full bg-zinc-950 text-zinc-300 text-sm p-4 focus:outline-none resize-none leading-relaxed font-mono"
          />
        </div>

        {/* Middle: Execute Button */}
        <div className="flex flex-col justify-center items-center px-2">
          <button
            onClick={handleExecute}
            disabled={isExecuting || !chartText.trim()}
            className={`flex flex-col items-center justify-center gap-2 w-24 h-24 rounded-full transition-all ${
              isExecuting 
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                : chartText.trim() 
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 hover:scale-105' 
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            {isExecuting ? (
              <Loader2 size={32} className="animate-spin" />
            ) : (
              <Play size={32} className="ml-1" />
            )}
            <span className="text-xs font-bold uppercase tracking-wider">
              {isExecuting ? '计算中' : '执行引擎'}
            </span>
          </button>
        </div>

        {/* Right: Output Area */}
        <div className="w-[45%] flex flex-col bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="bg-zinc-950/50 border-b border-zinc-800 px-4 py-3">
            <h3 className="text-sm font-medium text-zinc-200 uppercase tracking-wider">解析结果展示区</h3>
            <p className="text-xs text-zinc-500 mt-1">实时验证当前配置的推理逻辑</p>
          </div>
          
          <div className="flex-1 overflow-auto p-5 bg-zinc-950">
            {!result && !isExecuting && (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                <ArrowRight size={48} className="mb-4 opacity-20" />
                <p className="text-sm">点击执行引擎获取解析结果</p>
              </div>
            )}

            {isExecuting && (
              <div className="h-full flex flex-col items-center justify-center text-emerald-500">
                <Loader2 size={48} className="animate-spin mb-4" />
                <p className="text-sm font-mono animate-pulse">正在进行多维共振计算...</p>
              </div>
            )}

            {result && !isExecuting && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Score */}
                <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
                  <span className="text-sm font-medium text-zinc-400 uppercase tracking-wider">同气得分</span>
                  <span className="text-3xl font-bold text-emerald-400 font-mono">{result.resonanceScore.toFixed(1)}</span>
                </div>

                {/* Triggered Rules & Fuels */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
                    <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">命中规则</h4>
                    <ul className="space-y-2">
                      {result.hitRules.length > 0 ? result.hitRules.map((rule: string, i: number) => (
                        <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                          <span className="text-emerald-500 mt-0.5">▸</span>
                          {rule}
                        </li>
                      )) : (
                        <li className="text-sm text-zinc-600 italic">未命中任何规则</li>
                      )}
                    </ul>
                  </div>
                  
                  <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
                    <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">触发燃料</h4>
                    <ul className="space-y-2">
                      {result.triggeredFuels.length > 0 ? result.triggeredFuels.map((fuel: any, i: number) => (
                        <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                          <span className="text-emerald-500 mt-0.5">▸</span>
                          <span className="truncate" title={fuel.condition}>{fuel.condition}</span>
                        </li>
                      )) : (
                        <li className="text-sm text-zinc-600 italic">未触发任何燃料</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* AI Script */}
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
                  <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">AI 话术生成结果</h4>
                  <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {result.aiScript}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
