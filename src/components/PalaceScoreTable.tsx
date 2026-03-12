import React from 'react';

interface PalaceScoreTableProps {
  iztroData: any;
}

export default function PalaceScoreTable({ iztroData }: PalaceScoreTableProps) {
  if (!iztroData) return <div className="p-10 text-zinc-500 text-center">暂无数据</div>;

  let data;
  try {
    let clean = iztroData;
    if (typeof clean === 'string') {
      if (!clean.startsWith('{')) clean = clean.match(/\{[\s\S]*\}/)?.[0] || '{}';
      data = JSON.parse(clean);
    } else {
      data = clean;
    }
  } catch (e) {
    return <div className="p-10 text-red-500 text-center">数据解析失败</div>;
  }

  // 模拟一些评分数据，如果实际逻辑在其他地方，用户可以替换
  const palaces = [
    { name: '命宫', score: 85, status: '吉' },
    { name: '兄弟宫', score: 60, status: '平' },
    { name: '夫妻宫', score: 45, status: '凶' },
    { name: '子女宫', score: 70, status: '吉' },
    { name: '财帛宫', score: 90, status: '大吉' },
    { name: '疾厄宫', score: 55, status: '平' },
    { name: '迁移宫', score: 75, status: '吉' },
    { name: '交友宫', score: 40, status: '凶' },
    { name: '官禄宫', score: 88, status: '大吉' },
    { name: '田宅宫', score: 82, status: '吉' },
    { name: '福德宫', score: 65, status: '平' },
    { name: '父母宫', score: 78, status: '吉' },
  ];

  return (
    <div className="p-4 w-full h-full overflow-auto custom-scrollbar bg-zinc-950 flex flex-col items-center">
      <div className="mb-4 flex items-center justify-between w-full max-w-4xl">
        <h3 className="text-emerald-400 font-medium flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          宫位量化分析报告
        </h3>
        <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Resonance Analysis v2.0</span>
      </div>
      
      <div className="grid grid-cols-1 gap-2 w-full max-w-4xl">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-800/50 text-zinc-400 uppercase tracking-tighter">
              <tr>
                <th className="px-3 py-2 font-medium">宫位</th>
                <th className="px-3 py-2 font-medium">共振得分</th>
                <th className="px-3 py-2 font-medium">状态判定</th>
                <th className="px-3 py-2 font-medium">核心影响</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {palaces.map((p, idx) => (
                <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-3 py-2 text-zinc-200 font-medium">{p.name}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden max-w-[60px]">
                        <div 
                          className={`h-full rounded-full ${p.score > 80 ? 'bg-emerald-500' : p.score > 60 ? 'bg-blue-500' : 'bg-amber-500'}`}
                          style={{ width: `${p.score}%` }}
                        ></div>
                      </div>
                      <span className="font-mono text-zinc-400">{p.score}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded-sm text-[10px] ${
                      p.status === '大吉' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      p.status === '吉' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      p.status === '平' ? 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30' :
                      'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-zinc-500 text-[10px]">
                    {p.score > 80 ? '能量充沛，多维共振强' : p.score > 60 ? '状态稳定，平稳运行' : '能量受损，需注意破耗'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-emerald-900/10 border border-emerald-900/30 rounded-lg w-full max-w-4xl">
        <h4 className="text-[10px] font-bold text-emerald-500 uppercase mb-1">AI 深度建议</h4>
        <p className="text-xs text-zinc-400 leading-relaxed">
          当前格局中，{palaces.sort((a,b) => b.score - a.score)[0].name}能量最强，可作为今年突破点；而{palaces.sort((a,b) => a.score - b.score)[0].name}得分偏低，建议在相关领域保持保守策略。
        </p>
      </div>
    </div>
  );
}
