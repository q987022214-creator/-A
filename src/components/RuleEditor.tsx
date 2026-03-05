import React, { useState, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Save, CheckCircle2, ChevronDown, ChevronUp, BookOpen, GitMerge } from 'lucide-react';

type SchoolType = 'Zhongzhou' | 'FlyingStar' | 'Hybrid';

interface Step {
  id: string;
  title: string;
  description: string;
}

interface SchoolData {
  name: string;
  description: string;
  steps: Step[];
}

const SCHOOLS: Record<SchoolType, SchoolData> = {
  Zhongzhou: {
    name: '中州派 (Zhongzhou)',
    description: '注重星曜赋性与格局，强调三方四正的星系组合与多宫联动。',
    steps: [
      {
        id: 'step-1',
        title: '侦探第一步：定星系大局 (寻找核心作案动机)',
        description: '规则：绝不单看命宫一颗星！必须一眼扫过命、财、官、迁，确认其属于四大基本星系中的哪一种（机月同梁、杀破狼、紫府武相、巨日）。\n推演目标：定下此人的“人生底层操作吸引力法则”。（例如：机月同梁必是体制内或企划幕僚，绝不可能是提刀上马的莽汉；杀破狼必一生动荡求变）。'
      },
      {
        id: 'step-2',
        title: '侦探第二步：寻“对星”辅佐 (盘点作案工具与帮手)',
        description: '规则：中州派极重“对星”（左辅右弼、天魁天钺、文昌文曲）。看到单星不作数，必须成对出现（同宫、夹宫或三方会照）。\n推演目标：判定格局高低。若主星强悍却“吉曜单见”，判定为“孤军奋战，虽成也苦”；若主星柔弱却“百官朝拱”，判定为“借力打力，平步青云”。'
      },
      {
        id: 'step-3',
        title: '侦探第三步：捉拿“生年化忌” (锁定人生的原罪与漏洞)',
        description: '规则：全盘搜捕“生年化忌”落入何宫。化忌所在的宫位，就是此人一生最执着、最容易犯错、最终必然产生破耗的“黑洞”。\n推演目标：如果化忌在夫妻，此人事业再好，最终也会因感情破财或身败名裂；如果化忌在田宅，一生必有一次家业倾覆或房产纠纷。这是铁律，必须第一笔写在诊断书上。'
      },
      {
        id: 'step-4',
        title: '侦探第四步：四煞与空劫的“破坏力评估” (寻找致命伤)',
        description: '规则：羊陀火铃、地空地劫不是乱看的。要看它们是“化煞为用”还是“破格”。\n推演目标：煞星若冲破了原本美好的吉格（例如禄存被羊陀夹，又见火铃），直接判定为“因贪致败”或“暗藏杀机”。若煞星落在无关紧要的宫位，则视为性格小瑕疵，不影响大局。'
      },
      {
        id: 'step-5',
        title: '侦探第五步：大限流年的“重叠引动” (案发时间与地点定性 - 极其核心)',
        description: '规则：批流年时，必须执行“叠宫联动”。绝对不能只看流年宫位本身！必须提取公式：流年某宫 叠 大限某宫 叠 原局某宫。\n推演示例：“流年财帛宫” 叠 “大限疾厄宫” 叠 “原局田宅宫”。AI 必须得出结论：“今年动用的现金流（财帛），是因为身体健康原因（疾厄），且最终动用了家底存款或为了房产（田宅）”。'
      },
      {
        id: 'step-6',
        title: '侦探第六步：飞星“禄随忌走”的因果追踪 (还原犯罪过程)',
        description: '规则：化禄代表原因/开始，化忌代表结果/归宿。\n推演示例：若今年化禄在交友宫，化忌在财帛宫。AI 必须连词成句：“今年你会因为朋友的引诱或合作（交友禄，起因），最终导致自己破财（财帛忌，结果）”。反之，若禄在财，忌在友，则是“今年你赚到了钱，但钱最终都花在了朋友身上或被朋友借走”。'
      }
    ]
  },
  FlyingStar: {
    name: '飞星派 (Flying Star)',
    description: '以宫干四化飞星为主，注重宫位之间的气数流转与因果关系。',
    steps: [
      {
        id: 'step-1',
        title: '步骤 1：立太极与寻体用',
        description: '确定论事的主体宫位（太极点），寻找对应的用位。'
      },
      {
        id: 'step-2',
        title: '步骤 2：四化飞动与追踪',
        description: '观察宫干引发的禄权科忌飞向何宫，追踪气数的流向与结果。'
      }
    ]
  },
  Hybrid: {
    name: '综合派 (Hybrid)',
    description: '结合星曜格局与飞星四化，体用兼顾的现代综合论法。',
    steps: [
      {
        id: 'step-1',
        title: '步骤 1：星格定底色',
        description: '先以中州派手法定下命盘的先天格局与星曜底色。'
      },
      {
        id: 'step-2',
        title: '步骤 2：飞星定契机',
        description: '再以飞星手法寻找大限流年的吉凶应期与事件触发点。'
      }
    ]
  }
};

export default function RuleEditor() {
  const [activeRule, setActiveRule] = useLocalStorage<SchoolData | null>('ziwei_active_rule', SCHOOLS.Zhongzhou);
  const [selectedSchool, setSelectedSchool] = useState<SchoolType>('Zhongzhou');
  const [savedStatus, setSavedStatus] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({
    'step-1': true,
    'step-2': true,
    'step-3': true,
    'step-4': true,
    'step-5': true,
    'step-6': true
  });

  useEffect(() => {
    if (activeRule) {
      const schoolKey = Object.keys(SCHOOLS).find(
        key => SCHOOLS[key as SchoolType].name === activeRule.name
      ) as SchoolType;
      if (schoolKey) {
        setSelectedSchool(schoolKey);
      }
    }
  }, [activeRule]);

  const handleSchoolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const school = e.target.value as SchoolType;
    setSelectedSchool(school);
    // Expand all steps for the new school by default
    const newExpanded: Record<string, boolean> = {};
    SCHOOLS[school].steps.forEach(step => {
      newExpanded[step.id] = true;
    });
    setExpandedSteps(newExpanded);
  };

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const handleSave = () => {
    setActiveRule(SCHOOLS[selectedSchool]);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2000);
  };

  const currentSchoolData = SCHOOLS[selectedSchool];

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-100 tracking-tight">规则引擎配置 (Rule Engine)</h2>
          <p className="text-sm text-zinc-400 mt-1">设置看盘的先后顺序和条件覆盖逻辑。</p>
        </div>
        <button 
          onClick={handleSave}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          {savedStatus ? <CheckCircle2 size={16} /> : <Save size={16} />}
          {savedStatus ? '已保存' : '保存规则'}
        </button>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        {/* Left Column: School Selection */}
        <div className="w-1/3 flex flex-col gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={18} className="text-emerald-500" />
              <h3 className="text-sm font-medium text-zinc-200 uppercase tracking-wider">选择核心流派</h3>
            </div>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
              选择一个命理流派，右侧将展示该流派的解析逻辑链路。保存后，AI 将严格按照此逻辑进行解盘。
            </p>
            <select 
              value={selectedSchool}
              onChange={handleSchoolChange}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 text-sm rounded-md px-3 py-2 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 appearance-none"
            >
              {Object.entries(SCHOOLS).map(([key, data]) => (
                <option key={key} value={key}>{data.name}</option>
              ))}
            </select>
            
            <div className="mt-6 p-4 bg-zinc-950/50 rounded-md border border-zinc-800/50">
              <h4 className="text-xs font-medium text-zinc-400 mb-2">流派简介</h4>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {currentSchoolData.description}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Analysis Pipeline */}
        <div className="w-2/3 flex flex-col bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden relative">
          <div className="bg-zinc-950/50 border-b border-zinc-800 px-5 py-4 flex items-center gap-2">
            <GitMerge size={18} className="text-emerald-500" />
            <h3 className="text-sm font-medium text-zinc-200 uppercase tracking-wider">解析逻辑链路 (Analysis Pipeline)</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 bg-zinc-950/30">
            <div className="relative border-l-2 border-zinc-800 ml-4 space-y-8 pb-4">
              {currentSchoolData.steps.map((step, index) => {
                const isExpanded = expandedSteps[step.id];
                return (
                  <div key={step.id} className="relative pl-8">
                    {/* Timeline dot */}
                    <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-zinc-900 border-2 border-emerald-500 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    </div>
                    
                    {/* Step Card */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden transition-all hover:border-zinc-700">
                      <button 
                        onClick={() => toggleStep(step.id)}
                        className="w-full px-5 py-4 flex items-center justify-between bg-zinc-900 hover:bg-zinc-800/50 transition-colors text-left"
                      >
                        <span className="text-sm font-medium text-emerald-400">{step.title}</span>
                        {isExpanded ? (
                          <ChevronUp size={16} className="text-zinc-500" />
                        ) : (
                          <ChevronDown size={16} className="text-zinc-500" />
                        )}
                      </button>
                      
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-1 border-t border-zinc-800/50 bg-zinc-950/50">
                          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                            {step.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
