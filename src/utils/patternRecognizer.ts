// src/utils/patternRecognizer.ts
import { STEM_MUTAGENS } from './scoreCalculator';

export interface PatternResult {
  palaceIndex: number;
  palaceName: string;
  patternName: string;
  type: '吉' | '凶';
  finalScore: number;
  branch: 'A' | 'B' | 'C';
  summary: string;
  advice: string;
  isInnerPalace: boolean;     
  supplementaryAdvice?: string; 
  isAdvantage: boolean;
  showInDashboard: boolean; 
  advantageText?: string;
}

const getStars = (palace: any) => {
  const stars: string[] = [];
  if (palace.majorStars) palace.majorStars.forEach((s: any) => stars.push(s.name));
  if (palace.minorStars) palace.minorStars.forEach((s: any) => stars.push(s.name));
  return stars;
};

// 🚀 终极三方四正全息雷达
const checkMutagenSF = (palaces: any[], currentIndex: number, type: string) => {
  const sfIndices = [currentIndex, (currentIndex + 4) % 12, (currentIndex + 8) % 12, (currentIndex + 6) % 12];
  for (const idx of sfIndices) {
    const p = palaces[idx];
    if (p.stars) {
      if (type === '禄' && p.stars.some((s:string) => s.includes('禄存') || s.includes('[化禄]'))) return true;
      if (type !== '禄' && p.stars.some((s:string) => s.includes(`[化${type}]`))) return true;
    }
    const rawStars = [...(p.majorStars||[]), ...(p.minorStars||[])];
    if (type === '禄' && rawStars.some((s:any) => s.mutagen === '禄' || s.name === '禄存')) return true;
    if (type !== '禄' && rawStars.some((s:any) => s.mutagen === type)) return true;
  }
  return false;
};

const hasMutagenPalace = (palaces: any[], currentIndex: number, type: string) => {
  const p = palaces[currentIndex];
  if (p.stars) {
    if (type === '禄' && p.stars.some((s:string) => s.includes('禄存') || s.includes('[化禄]'))) return true;
    if (type !== '禄' && p.stars.some((s:string) => s.includes(`[化${type}]`))) return true;
  }
  const rawStars = [...(p.majorStars||[]), ...(p.minorStars||[])];
  if (type === '禄' && rawStars.some((s:any) => s.mutagen === '禄' || s.name === '禄存')) return true;
  if (type !== '禄' && rawStars.some((s:any) => s.mutagen === type)) return true;
  return false;
};

export function recognizePatterns(iztroData: any): PatternResult[] {
  if (!iztroData || !iztroData.palaces) return [];
  const palaces = iztroData.palaces;
  const results: PatternResult[] = [];
  const INNER_PALACES = ['命宫', '财帛宫', '官禄宫', '迁移宫', '夫妻宫', '子女宫'];

  for (let i = 0; i < 12; i++) {
    const curP = palaces[i];
    const oppP = palaces[(i + 6) % 12];
    const trA = palaces[(i + 4) % 12];
    const trB = palaces[(i + 8) % 12];
    const prevIdx = (i + 11) % 12; 
    const nextIdx = (i + 1) % 12;  
    const prevP = palaces[prevIdx];
    const nextP = palaces[nextIdx];

    const pNameRaw = curP.name || '';
    const pName = pNameRaw.endsWith('宫') ? pNameRaw : pNameRaw + '宫';
    const branchName = curP.earthlyBranch;

    const cStars = getStars(curP);
    const oStars = getStars(oppP);
    const sfStars = [...cStars, ...oStars, ...getStars(trA), ...getStars(trB)];
    const prevStars = getStars(prevP);
    const nextStars = getStars(nextP);
    
    const isCurEmpty = !curP.majorStars || curP.majorStars.length === 0;
    const isInner = INNER_PALACES.includes(pName);

    const badStars = ['擎羊', '陀罗', '火星', '铃星', '地空', '地劫'];
    let sfBadCount = sfStars.filter(s => badStars.includes(s)).length;

    const calculatePurity = () => {
      let p = 1.0;
      if (sfStars.includes('左辅') && sfStars.includes('右弼')) p += 0.1;
      if (sfStars.includes('天魁') && sfStars.includes('天钺')) p += 0.1;
      p -= (sfBadCount * 0.15);
      return Math.max(0.1, Math.min(1.5, p)); 
    };

    // 🚀 核心降维引擎：闲宫分数强制腰斩，且绝不进入 Dashboard 展示
    const addResult = (patternName: string, score: number, branch: 'A'|'B'|'C', summary: string, advice: string, supplementaryAdvice: string, advantageText: string = "", isAdvantage: boolean = false) => {
      let finalScore = score * calculatePurity();
      if (!isAdvantage) finalScore *= 0.5; // 闲宫减半
      if (isCurEmpty && finalScore > 0) finalScore *= 0.7; 
      finalScore = Math.max(-12, Math.min(12, finalScore));
      
      results.push({
        palaceIndex: i, palaceName: pName, patternName,
        type: finalScore > 0 ? '吉' : '凶', finalScore: Number(finalScore.toFixed(1)), branch, summary, 
        advice, isInnerPalace: isInner, supplementaryAdvice, 
        isAdvantage, showInDashboard: isAdvantage, advantageText
      });
    };

    // 🟢 01. 【火贪/铃贪格】
    if (cStars.includes('贪狼') && (cStars.includes('火星') || cStars.includes('铃星') || oStars.includes('火星') || oStars.includes('铃星'))) {
      const isAdv = ['命宫', '财帛宫', '官禄宫'].includes(pName);
      let advText = "";
      if (pName === '命宫') advText = "辰戌为四墓库，贪狼入墓库能收敛桃花气，专注财富积累；火/铃激发偏财，形成暴发格局！";
      else if (pName === '财帛宫') advText = "财富多呈阶梯式爆发跳跃。利于通过把握新兴风口获得丰厚收益。";
      else if (pName === '官禄宫') advText = "事业易有突发性高升，或接到极高提成的重头项目。";

      if (sfStars.includes('地空') || sfStars.includes('地劫') || hasMutagenPalace(palaces, i, '忌') || sfBadCount >= 3) {
        addResult('【火贪/铃贪格】 突发波动格', -4, 'A', '破格 / 根基受损', '该格局本具突发之机，但遇空劫或化忌冲破，主大起大落。建议稳健守成，严防高杠杆投资。', '外部环境呈现突变特征，警惕突发性财务消耗。', '', isAdv);
      } else if (checkMutagenSF(palaces, i, '忌') || sfBadCount >= 1) {
        addResult('【火贪/铃贪格】 突发波动格', 2, 'B', '受阻 / 获利伴波折', '具备突破潜力，但伴随激烈竞争。机遇多在变动中产生，见好就收。', '防范突发财务消耗。', '', isAdv);
      } else {
        addResult('【火贪/铃贪格】 突发波动格', 8, 'C', '成格 / 顺势突破', '爆发力极强，能在特定周期内获得突破性进展。遇行业风口建议果断行动，随后转化为稳固资产。', '易偶然结识爆发潜力合伙人。', advText, isAdv);
      }
    }

    // 🟢 02. 【马头带剑格】
    if (cStars.includes('天同') && cStars.includes('擎羊') && branchName === '午') {
      const isAdv = ['命宫', '迁移宫', '官禄宫'].includes(pName);
      let advText = "";
      if (pName === '命宫') advText = "午宫属火，擎羊属金，火炼金成器！得此格为大将之格，适合武职、边疆、外交领域。";
      else if (pName === '迁移宫') advText = "极利外出发展，在陌生环境中能爆发出极强的生命力与威望。";
      else if (pName === '官禄宫') advText = "职场作风雷厉风行，适合公检法、工程等硬核技术部门。";

      if (sfStars.includes('地空') || sfStars.includes('地劫') || checkMutagenSF(palaces, i, '忌')) {
        addResult('【马头带剑格】 边疆开拓格', -4, 'A', '破格 / 盲目冲动', '受空劫化忌破坏，决策易受情绪驱使。防意外工伤，宜选择按部就班的文职。', '防范下属反叛或轻信他人导致外伤。', '', isAdv);
      } else if (sfStars.includes('火星') || sfStars.includes('铃星') || sfStars.includes('陀罗')) {
        addResult('【马头带剑格】 边疆开拓格', 2, 'B', '受阻 / 激烈竞争', '先苦后甜，事业必经坎坷。适合挑战性前沿开发，熬过低谷方能站稳。', '环境带有极强的攻击性与竞争意识。', '', isAdv);
      } else {
        addResult('【马头带剑格】 边疆开拓格', 8, 'C', '成格 / 极致执行', '具备顶级开创执行力。极其适合异地发展或接手极具挑战性的新项目，必能以战绩服众。', '主外部助力强悍，能结交实权朋友。', advText, isAdv);
      }
    }

    // 🟢 03. 【雄宿乾元格】
    if ((cStars.includes('廉贞') && cStars.includes('七杀') && branchName === '未') || (cStars.includes('廉贞') && branchName === '申' && oStars.includes('七杀')) || (cStars.includes('七杀') && branchName === '午')) {
      const isAdv = ['命宫', '官禄宫'].includes(pName);
      let advText = pName === '命宫' ? "自身气场不怒自威，一生追求极致效率与成就感，极具个人魅力。" : "职场作风硬朗，适合跨国重工业、大型基础建设或公检法高层。";
      
      if (sfBadCount >= 4 || (sfStars.includes('地空') && sfStars.includes('地劫'))) {
        addResult('【雄宿乾元格】 刚毅开创格', -3, 'A', '破格 / 过刚易折', '性格易刚愎自用，绝不可游走合规红线。防范因刚烈导致的诉讼或意外。', '极易与合伙人发生严重利益冲突。', '', isAdv);
      } else if (checkMutagenSF(palaces, i, '忌') || sfBadCount > 0) {
        addResult('【雄宿乾元格】 刚毅开创格', 3, 'B', '受阻 / 苦战夺魁', '成就多在高度施压与竞争中获得。适合担任攻坚部门负责人，抗压能力强。', '需以柔克刚应对外部危机。', '', isAdv);
      } else {
        addResult('【雄宿乾元格】 刚毅开创格', 9, 'C', '成格 / 战略统御', '兼具战略眼光与雷霆执行力。宜向大型企业一把手迈进，放权执行掌控大局。', '能得强硬机构实质性提携。', advText, isAdv);
      }
    }

    // 🟢 04. 【石中隐玉格】
    if (cStars.includes('巨门') && (branchName === '子' || branchName === '午') && (hasMutagenPalace(palaces, i, '禄') || hasMutagenPalace(palaces, i, '权') || hasMutagenPalace(palaces, i, '科'))) {
      const isAdv = ['命宫', '财帛宫', '官禄宫'].includes(pName);
      let advText = pName === '命宫' ? "大智若愚，城府极深。擅长隐忍与谋划，典型的谋士或低调巨富。" : (pName === '财帛宫' ? "财富多源于专业技能或不公开独特渠道，极适合闷声发大财。" : "主得清要之职，适合文职管理岗位。");

      if (cStars.includes('擎羊') || hasMutagenPalace(palaces, i, '忌')) {
        addResult('【石中隐玉格】 韫椟藏珠格', -6, 'A', '破格 / 言多必失', '极易因沟通不当引发严重诉讼与名誉危机。谨言慎行，绝不参与是非议论。', '防范背后捅刀的隐性小人。', '', isAdv);
      } else if (sfBadCount > 0) {
        addResult('【石中隐玉格】 韫椟藏珠格', 2, 'B', '受阻 / 怀才不遇', '外界往往难以察觉您的真实实力，建议深耕某一冷门专业领域，靠硬实力说话。', '潜藏危机，人际易生误解。', '', isAdv);
      } else {
        addResult('【石中隐玉格】 韫椟藏珠格', 8, 'C', '成格 / 厚积薄发', '高筑墙广积粮是核心战略。早中期待资源成熟后，必能一鸣惊人收获财富地位。', '能得暗中贵人提携。', advText, isAdv);
      }
    }

    // 🟢 05. 【贪武同行格】
    if ((cStars.includes('武曲') && cStars.includes('贪狼') && (branchName === '丑' || branchName === '未')) || (cStars.includes('武曲') && oStars.includes('贪狼') && (branchName === '辰' || branchName === '戌'))) {
      const isAdv = ['财帛宫', '官禄宫'].includes(pName);
      let advText = pName === '财帛宫' ? "财富积累先抑后扬。早年储蓄困难，中晚年极易执掌大额现金流或企业财权。" : "事业起步较晚，适合从事财税金融或高强度商贸工作。";

      if (sfStars.includes('地空') || sfStars.includes('地劫') || hasMutagenPalace(palaces, i, '忌')) {
        addResult('【贪武同行格】 大器晚成格', -4, 'A', '破格 / 财务破败', '不宜独立创业或过度扩张！极易遭遇资金链断裂。建议在体制内凭薪资安身立命。', '早年极易受朋友拖累财务。', '', isAdv);
      } else if (sfStars.includes('擎羊') || sfStars.includes('陀罗')) {
        addResult('【贪武同行格】 大器晚成格', 2, 'B', '受阻 / 极度劳碌', '早中年必经历极高工作强度，坚定深耕单一行业，中年后必能实现稳步攀升。', '人际交往应以务实利益为导向。', '', isAdv);
      } else if (hasMutagenPalace(palaces, i, '禄') && (sfStars.includes('火星') || sfStars.includes('铃星'))) {
        addResult('【贪武同行格】 大器晚成格', 8, 'C', '成格 / 将星暴发', '坚韧抗压，极易在金融运作或实体制造中捕捉时代红利，实现阶层跨越。', '中晚年结识手握重资合伙人。', advText, isAdv);
      }
    }

    // 🟢 15. 【三奇加会格】 🚀 (全息雷达完美修复)
    if (checkMutagenSF(palaces, i, '禄') && checkMutagenSF(palaces, i, '权') && checkMutagenSF(palaces, i, '科')) {
      const isAdv = ['命宫', '官禄宫', '财帛宫'].includes(pName);
      let advText = "三奇主财富、权力、名声！分布于命财官形成自我成就，能量均衡不偏废，事业通达财富稳定！";
      
      if (checkMutagenSF(palaces, i, '忌') && sfBadCount >= 3) {
        addResult('【三奇加会格】 顺风顺水格', -2, 'A', '破格 / 华而不实', '易在顶峰因执念跌落，切忌盲目扩张触碰红线，防范身败名裂。', '防范高层派系斗争波及自身。', '', isAdv);
      } else if (sfBadCount > 0 || checkMutagenSF(palaces, i, '忌')) {
        addResult('【三奇加会格】 顺风顺水格', 4, 'B', '受阻 / 名利伴争', '晋升求财伴随非议竞争。保持抗压能力，在复杂斗争中稳中求胜。', '竞争环境险恶，需心理素质。', '', isAdv);
      } else {
        addResult('【三奇加会格】 顺风顺水格', 10, 'C', '成格 / 顺风顺水', '名声、地位财富三者兼得的完美配置！在合法前提下大胆攀登巅峰。', '关键时刻得重权贵人全力托举。', advText, isAdv);
      }
    }

    // 🟢 25. 【财荫夹印格】 (🚀 修复了崩溃 Bug)
    if (cStars.includes('天相')) {
      const prevL = hasMutagenPalace(palaces, prevIdx, '禄');
      const nextL = hasMutagenPalace(palaces, nextIdx, '禄');
      const isCaiYin = (prevL && nextStars.includes('天梁')) || (nextL && prevStars.includes('天梁'));
      
      if (isCaiYin) {
        const isAdv = ['命宫', '财帛宫'].includes(pName);
        let advText = pName === '命宫' ? "自带福荫，为人稳重守信，易得他人资助，平顺少波折。" : "钱财来源稳定，常有来自长辈赠予，适合长线理财。";
        
        if (cStars.includes('地空') || cStars.includes('地劫') || hasMutagenPalace(palaces, i, '忌') || sfBadCount >= 3) {
          addResult('【财荫夹印格】 资源庇护格', -3, 'A', '破格 / 夹印受损', '受空忌冲击，庇护反成枷锁。保持财务独立，切勿将核心资产交他人打理。', '资源附带苛刻条件，警惕财务纠纷。', '', isAdv);
        } else if (sfBadCount > 0) {
          addResult('【财荫夹印格】 资源庇护格', 3, 'B', '受阻 / 庇护有瑕', '贵人运多在关键时刻显现，宜借力但不依附，用专业能力换取资源。', '贵人扶持伴随利益交换。', '', isAdv);
        } else {
          addResult('【财荫夹印格】 资源庇护格', 8, 'C', '成格 / 双重庇护', '一生易得长辈疼惜上级提携，适合在稳定大机构深耕，稳健攀升。', '父母宫/田宅宫能提供资金房产支持。', advText, isAdv);
        }
      }
    }

    // 🔴 31. 【刑忌夹印格】 (🚀 修复了崩溃 Bug)
    if (cStars.includes('天相')) {
      const isJia = (hasMutagenPalace(palaces, prevIdx, '忌') && (nextStars.includes('天梁') || nextStars.includes('擎羊'))) || 
                    (hasMutagenPalace(palaces, nextIdx, '忌') && (prevStars.includes('天梁') || prevStars.includes('擎羊')));
      if (isJia) {
        const isAdv = ['命宫', '财帛宫', '夫妻宫', '官禄宫'].includes(pName);
        let advText = pName === '官禄宫' ? "职场极易遭遇背锅事件，宜从事纪检审计等带刑忌职业以毒攻毒！" : "伤害极大！主多是非官司、破财被骗或婚姻反目！";
        
        if (hasMutagenPalace(palaces, i, '禄') || hasMutagenPalace(palaces, i, '权') || hasMutagenPalace(palaces, i, '科')) {
          addResult('【刑忌夹印格】 腹背受敌格', 2, 'A', '完美化解 / 夹处逢生', '外界高压但抗压强，化被动为主动！适合处理高难度纠纷或危机公关。', '虽出身恶劣但能成功切割。', '', isAdv);
        } else if (sfStars.includes('左辅') || sfStars.includes('右弼') || sfStars.includes('天魁')) {
          addResult('【刑忌夹印格】 腹背受敌格', -3, 'B', '轻度化解 / 苦撑待变', '夹在中间受气易背锅，签署合同务必核对防连带责任。多求助长辈。', '苦撑待变，防连带责任。', '', isAdv);
        } else {
          addResult('【刑忌夹印格】 腹背受敌格', -7, 'C', '绝对成格 / 腹背受敌', '印绶信用遭破坏，绝不可做财务担保或触碰合规红线！若企业违规立即辞职。', '家庭或合伙人强势且多官非拖累命主。', advText, isAdv);
        }
      }
    }

    // 🟢 28. 【禄马交驰格】 动中得财格 🌟🌟🌟 (最新完整植入)
    if ((checkMutagenSF(palaces, i, '禄') || sfStars.includes('禄存')) && sfStars.includes('天马')) {
      const isAdv = ['迁移宫', '财帛宫', '命宫', '官禄宫'].includes(pName);
      let advText = "";
      if (pName === '迁移宫') advText = "动中得财，外出发展机遇无限，易在异地建立人脉与事业根基。";
      else if (pName === '财帛宫') advText = "财富来源多元化，常有多条并行收入渠道，尤利跨区域贸易跨境业务。";
      else if (pName === '命宫') advText = "一生好动，越动越顺，思维活跃，富贵双全！";
      else if (pName === '官禄宫') advText = "晋升靠主动争取与异地机会，出差外务多，动而有成。";

      if (sfStars.includes('地空') || sfStars.includes('地劫') || checkMutagenSF(palaces, i, '忌') || (cStars.includes('天马') && sfBadCount >= 3)) {
        addResult('【禄马交驰格】 动中得财格', -4, 'A', '破格 / 奔波无获', '受空劫冲击，奔波劳碌徒劳无功，防运输损耗或异地合同纠纷。固守本地为主。', '防范因异地事务引发的家庭财务纠纷。', '', isAdv);
      } else if (sfBadCount > 0) {
        addResult('【禄马交驰格】 动中得财格', 2, 'B', '受阻 / 劳碌求财', '财源来自频繁流动，过程辛劳。适合外贸物流跨境业务，见好就收。', '环境呈现高频流动特征。', '', isAdv);
      } else {
        addResult('【禄马交驰格】 动中得财格', 9, 'C', '成格 / 财通四海', '气势通畅财源广进！具备极强跨区资源整合力，宜大胆布局海外跨域业务。', '能通过异地朋友获商业机会或房产增值。', advText, isAdv);
      }
    }

  }

  return results.sort((a, b) => Math.abs(b.finalScore) - Math.abs(a.finalScore));
}
