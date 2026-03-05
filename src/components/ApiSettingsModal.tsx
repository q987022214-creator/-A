import React, { useState } from 'react';
import { X, Save, Plug, Loader2 } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApiSettingsModal({ isOpen, onClose }: ApiSettingsModalProps) {
  const [settings, setSettings] = useLocalStorage('ziwei_api_settings', {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'deepseek-chat'
  });

  const [localSettings, setLocalSettings] = useState(settings);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    setSettings(localSettings);
    onClose();
  };

  const handleTestConnection = async () => {
    const apiKey = localSettings.apiKey.trim();
    const baseUrl = localSettings.baseUrl.trim().replace(/\/+$/, '');
    const model = localSettings.model.trim() || 'deepseek-chat';

    if (!apiKey) {
      setTestResult({ type: 'error', message: '请先输入 API Key' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 5
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

      setTestResult({ type: 'success', message: 'API 连接成功！' });
    } catch (error: any) {
      setTestResult({ type: 'error', message: `连接失败: ${error.message}` });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-zinc-800/50 bg-zinc-950/50">
          <h3 className="text-lg font-medium text-zinc-200">API 设置</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-5">
          {testResult && (
            <div className={`p-3 rounded-md text-sm ${
              testResult.type === 'success' 
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
              {testResult.message}
            </div>
          )}
          
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
              API Base URL
            </label>
            <input
              type="text"
              value={localSettings.baseUrl}
              onChange={e => setLocalSettings({ ...localSettings, baseUrl: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="https://api.openai.com/v1"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
              API Key
            </label>
            <input
              type="password"
              value={localSettings.apiKey}
              onChange={e => setLocalSettings({ ...localSettings, apiKey: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="sk-..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
              Model
            </label>
            <input
              type="text"
              value={localSettings.model}
              onChange={e => setLocalSettings({ ...localSettings, model: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="deepseek-chat"
            />
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800/50 bg-zinc-950/50 flex justify-between items-center">
          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? <Loader2 size={16} className="animate-spin" /> : <Plug size={16} />}
            测试连接
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              <Save size={16} />
              保存设置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
