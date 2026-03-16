import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Database, User, Bot, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  isError?: boolean;
  payload?: string;
}

interface ChatBubbleProps {
  message: Message;
  onExtractFuel?: () => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, onExtractFuel }) => {
  const isUser = message.role === 'user';
  // 默认设为 false，确保数据包初始绝对是折叠（遮挡）状态
  const [isPayloadOpen, setIsPayloadOpen] = useState(false);

  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
        isUser ? 'bg-zinc-800 text-zinc-400' : 'bg-emerald-900/50 text-emerald-400 border border-emerald-800'
      }`}>
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      <div className={`max-w-[80%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser 
            ? 'bg-zinc-800 text-zinc-200 rounded-tr-sm' 
            : message.isError 
              ? 'bg-red-500/10 border border-red-500/20 text-red-400 rounded-tl-sm'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-sm'
        }`}>
          {message.content ? (
            <div className="whitespace-pre-wrap font-medium">{message.content}</div>
          ) : (
            message.role === 'ai' && !message.isError && (
              <div className="flex items-center gap-2 text-emerald-500">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-xs animate-pulse">跨维引擎共振中...</span>
              </div>
            )
          )}

          {/* 🚀 专属折叠数据包渲染区 */}
          {message.payload && (
            <div className="mt-3 border border-emerald-500/30 rounded-lg overflow-hidden bg-black/60 w-full sm:w-[400px]">
              <button 
                onClick={() => setIsPayloadOpen(!isPayloadOpen)}
                className="w-full flex items-center justify-between p-2.5 text-[11px] text-emerald-400/90 hover:bg-emerald-500/10 transition-colors"
              >
                <div className="flex items-center gap-2 font-mono">
                  <Database size={13} />
                  <span className="tracking-wider">后台隐式推演数据包 (Payload)</span>
                </div>
                {isPayloadOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {isPayloadOpen && (
                <div className="p-3 border-t border-emerald-500/20 bg-black">
                  <pre className="text-[10px] font-mono text-emerald-500/80 overflow-x-auto custom-scrollbar max-h-64 whitespace-pre-wrap select-all">
                    <code>{message.payload}</code>
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {isUser && onExtractFuel && (
          <button 
            onClick={onExtractFuel}
            className="text-[10px] text-zinc-500 hover:text-emerald-400 flex items-center gap-1 mt-1 transition-colors"
            title="提炼为规则"
          >
            💡 提炼为规则
          </button>
        )}
      </div>
    </div>
  );
}
