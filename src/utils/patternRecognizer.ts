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
  advantageText?: string;
  showInDashboard: boolean;
}

const getStars = (palace: any) => {
  const stars: string[] = [];
  if (palace.majorStars) palace.majorStars.forEach((s: any) => stars.push(s.name));
  if (palace.minorStars) palace.minorStars.forEach((s: any) => stars.push(s.name));
  return stars;
};

// 严谨检测：提取自化与生年四化
const hasMutagen = (palace: any, palaces: any[], currentIndex: number, mutagen: string) => {
  let res = false;
  const stars = getStars(palace);
  
  const checkMutagen = (s: any) => { if (s.mutagen === mutagen) res = true; };
  if (palace.majorStars) palace.majorStars.forEach(checkMutagen);
  if (palace.minorStars) palace.minorStars.forEach(checkMutagen);
  
  const myStem = palace.heavenlyStem;
  const oppStem = palaces[(currentIndex + 6) % 12].heavenlyStem;
  
  (STEM_MUTAGENS[myStem] || []).forEach(t => { if (stars.includes(t.star) && t.mutagen === mutagen) res = true; });
  (STEM_MUTAGENS[oppStem] || []).forEach(t => { if (stars.includes(t.star) && t.mutagen === mutagen) res = true; });

  return res;
};

const hasJi = (palace: any, palaces: any[], currentIndex: number) => hasMutagen(palace, palaces, currentIndex, '忌');
const hasLu = (palace: any, palaces: any[], currentIndex: number) => hasMutagen(palace, palaces, currentIndex, '禄') || getStars(palace).includes('禄存');
const hasQuan = (palace: any, palaces: any[], currentIndex: number) => hasMutagen(palace, palaces, currentIndex, '权');
const hasKe = (palace: any, palaces: any[], currentIndex: number) => hasMutagen(palace, palaces, currentIndex, '科');

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
    const prevP = palaces[(i + 11) % 12]; 
    const nextP = palaces[(i + 1) % 12];  

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

    const calculatePurity = (basePurity: number = 1.0) => {
      let p = basePurity;
      if (sfStars.includes('左辅') && sfStars.includes('右弼')) p += 0.1;
      if (sfStars.includes('天魁') && sfStars.includes('天钺')) p += 0.1;
      p -= (sfBadCount * 0.15);
      return Math.max(0.1, Math.min(1.5, p)); 
    };

    const addResult = (patternName: string, score: number, branch: 'A'|'B'|'C', summary: string, advice: string, supplementaryAdvice: string, advantageText: string = "", isAdvantage: boolean = false) => {
      let finalScore = score * calculatePurity();
      if (isCurEmpty && score > 0) finalScore *= 0.7; 
      finalScore = Math.max(-12, Math.min(12, finalScore)); // 极限扩展至12分
      
      // 🚀 核心逻辑：满血分数(>=5)且落在典型宫位(isInner)
      const showInDashboard = finalScore >= 5 && isInner;
      
      results.push({
        palaceIndex: i, palaceName: curP.name, patternName,
        type: score > 0 ? '吉' : '凶', finalScore: Number(finalScore.toFixed(1)), branch, summary, 
        advice, isInnerPalace: isInner, supplementaryAdvice, isAdvantage, advantageText,
        showInDashboard
      });
    };

    // ==========================================
    // 🟢 01. 【火贪/铃贪格】 突发波动格
    // ==========================================
    if (cStars.includes('贪狼') && (cStars.includes('火星') || cStars.includes('铃星') || oStars.includes('火星') || oStars.includes('铃星'))) {
      if (sfStars.includes('地空') || sfStars.includes('地劫') || hasJi(curP, palaces, i) || sfBadCount >= 3) {
        addResult('【火贪/铃贪格】 突发波动格', -4, 'A', '破格 / 根基受损', '该格局本具突发之机，但遇空劫或化忌冲破，主大起大落、横发横破。核心建议： 在相关领域极易出现冲动性决策，面对高回报诱惑往往难以克制风险偏好。建议一生以稳健守成为主，严禁参与具有赌博性质或超出自身承受能力的高杠杆投资，防范资金链断裂。', '您的外部人际环境或内在情绪呈现“突变、快节奏”的特征。需高度警惕突发性的财务消耗，严防因亲友借贷、合伙投资带来的瞬间破财。');
      } else if (hasJi(oppP, palaces, i) || hasJi(trA, palaces, i) || hasJi(trB, palaces, i) || sfBadCount >= 1) {
        addResult('【火贪/铃贪格】 突发波动格', 2, 'B', '受阻 / 获利伴波折', '具备突发突破的潜力，但环境夹杂微煞，主获利或晋升过程中伴随激烈的竞争或事后波动。核心建议： 机遇多在变动与忙碌中产生。当获得阶段性成果时，务必保持低调。请预留应对突发状况的冗余准备，见好就收，避免扩大战线。', '环境具有突变特征，防范突发财务消耗。');
      } else {
        const isAdv = ['财帛宫', '官禄宫'].includes(pName);
        addResult('【火贪/铃贪格】 突发波动格', 8, 'C', '成格 / 顺势突破', '气势通畅，爆发力极强，主能在特定周期内获得显著的突破性进展。核心建议： 具备较强的商业敏锐度与执行力。遇行业风口或转型期，建议果断采取行动。取得成果后，宜及时将高风险收益转化为稳固资产（如置产、定存）以夯实基础。', '易在偶然间结识具有爆发潜力的合伙人/朋友，或房产有突发增值之机。', isAdv ? "此格正落财帛/官禄！财富多呈阶梯式爆发跳跃。利于通过把握新兴风口或突发性业务获得丰厚收益。" : "", isAdv);
      }
    }

    // ==========================================
    // 🟢 02. 【马头带剑格】 边疆开拓格
    // ==========================================
    if (cStars.includes('天同') && cStars.includes('擎羊') && branchName === '午') {
      if (sfStars.includes('地空') || sfStars.includes('地劫') || hasJi(curP, palaces, i)) {
        addResult('【马头带剑格】 边疆开拓格', -4, 'A', '破格 / 盲目冲动', '本具开拓之能，但受空劫化忌破坏，化作纯粹的刑伤与盲目。核心建议： 您的决策易受情绪驱使，行事易不计后果。在职场与生活中必须防范意外工伤或文书失误。不宜从事高危或高强度竞争行业，宜选择按部就班的文职工作，凡事以和为贵。', '防范下属反叛、合伙人倒戈，或因轻信他人导致严重的财务破损与外伤。');
      } else if (sfStars.includes('火星') || sfStars.includes('铃星') || sfStars.includes('陀罗')) {
        addResult('【马头带剑格】 边疆开拓格', 2, 'B', '受阻 / 激烈竞争', '呈现先苦后甜、百折不挠的特质。核心建议： 您的事业或财务积累必经坎坷，早年易历经行业重组或重大挫折。适合从事极具挑战性的前沿开发、外科医疗或海外市场拓展。咬紧牙关熬过低谷，方能站稳脚跟。', '环境带有极强的攻击性与竞争意识。');
      } else {
        const isAdv = ['迁移宫', '官禄宫'].includes(pName);
        addResult('【马头带剑格】 边疆开拓格', 8, 'C', '成格 / 极致执行', '具备顶级的开创与执行能力，能将危机转化为转机。核心建议： 将内心的安逸需求转化为实质的开拓动力。您极其适合赴异地/异国发展，或在企业内部接手最具挑战性的新项目，必能以战绩服众，掌握实权。', '主外部助力强悍，能结交军警或手握实权的朋友。', isAdv ? "极利外出发展，在陌生环境中能爆发出极强的生命力与威望；职场作风雷厉风行。" : "", isAdv);
      }
    }

    // ==========================================
    // 🟢 03. 【雄宿乾元格】 刚毅开创格
    // ==========================================
    if ((cStars.includes('廉贞') && cStars.includes('七杀') && branchName === '未') || (cStars.includes('廉贞') && branchName === '申' && oStars.includes('七杀')) || (cStars.includes('七杀') && branchName === '午')) {
      if (sfBadCount >= 4 || (sfStars.includes('地空') && sfStars.includes('地劫'))) {
        addResult('【雄宿乾元格】 刚毅开创格', -3, 'A', '破格 / 过刚易折', '杀气过重且缺乏有效制约，呈现孤将陷阵之象。核心建议： 性格容易刚愎自用，行事偏激。一生需严格遵纪守法，绝不可游走于合规红线边缘。防范因性格刚烈导致的严重诉讼、人际决裂或意外伤灾。学会妥协与柔和是终生课题。', '外部环境极其险恶，极易与合伙人、长辈发生严重的利益冲突甚至诉讼纠纷。');
      } else if (hasJi(curP, palaces, i) || sfBadCount > 0) {
        addResult('【雄宿乾元格】 刚毅开创格', 3, 'B', '受阻 / 苦战夺魁', '雄心万丈，但成功需建立在硬碰硬的博弈之上。核心建议： 成就多在高度施压与竞争中获得。逢化忌需防范心血管或呼吸道健康隐患。适合在大型机构中担任纪检、风控或攻坚部门负责人，抗压能力极强。', '环境刚烈，需以柔克刚应对外部危机。');
      } else {
        const isAdv = ['命宫', '官禄宫'].includes(pName);
        addResult('【雄宿乾元格】 刚毅开创格', 9, 'C', '成格 / 战略统御', '兼具长远战略眼光与雷霆般的执行手段。核心建议： 资源与团队配置齐备，具备极高的统帅气场。宜向大型企业一把手或政府核心部门迈进。放权给下属执行，自身掌控大局，事业版图将极其宏大。', '主能得雷厉风行之贵人或强硬机构的实质性提携。', isAdv ? "自身气场不怒自威，一生追求极致的效率与成就感，极具个人魅力与统帅力。" : "", isAdv);
      }
    }

    // ==========================================
    // 🟢 04. 【石中隐玉格】 韫椟藏珠格
    // ==========================================
    if (cStars.includes('巨门') && (branchName === '子' || branchName === '午') && (hasLu(curP, palaces, i) || hasQuan(curP, palaces, i) || hasKe(curP, palaces, i))) {
      if (cStars.includes('擎羊') || hasJi(curP, palaces, i)) {
        addResult('【石中隐玉格】 韫椟藏珠格', -6, 'A', '破格 / 言多必失', '犹如玉石遭遇重锤，主因言语或文书失误导致严重后果。核心建议： 极易因沟通不当、签署瑕疵合同或触碰敏感信息而引发严重诉讼与名誉危机。务必谨言慎行，绝不参与任何非官方的是非议论，明哲保身是最高生存准则。', '易遭人背后诋毁、遭遇暗箭伤人，在人际交往中需防范隐性小人。');
      } else if (sfBadCount > 0) {
        addResult('【石中隐玉格】 韫椟藏珠格', 2, 'B', '受阻 / 怀才不遇', '胸藏锦绣但缺乏展示平台，易感怀才不遇。核心建议： 外界往往难以察觉您的真实实力，且沟通中易生误解。建议放弃对外界即时认可的渴求，深耕某一专业度极高的冷门领域，靠硬实力说话。', '潜藏危机，人际易生波折。');
      } else {
        const isAdv = ['命宫', '财帛宫'].includes(pName);
        addResult('【石中隐玉格】 韫椟藏珠格', 8, 'C', '成格 / 厚积薄发', '典型的厚积薄发之象，才华最终将获市场极高认可。核心建议： ‘高筑墙，广积粮，缓称王’是您的核心战略。早中期务必保持低调内敛，切忌过早炫耀锋芒。待资源与经验成熟后，必能一鸣惊人，收获极高的社会地位与财富。', '能得暗中的贵人提携，或在不为人知的渠道获益。', isAdv ? "擅长隐忍与谋划，财富多源于专业技能或不公开的独特渠道，极适合闷声发大财。" : "", isAdv);
      }
    }

    // ==========================================
    // 🟢 05. 【贪武同行格】 大器晚成格
    // ==========================================
    if ((cStars.includes('武曲') && cStars.includes('贪狼') && (branchName === '丑' || branchName === '未')) || (cStars.includes('武曲') && oStars.includes('贪狼') && (branchName === '辰' || branchName === '戌'))) {
      if (sfStars.includes('地空') || sfStars.includes('地劫') || hasMutagen(curP, palaces, i, '忌')) {
        addResult('【贪武同行格】 大器晚成格', -4, 'A', '破格 / 财务破败', '对物质追求期望过高，但受空忌破坏，呈现财库见空之象。核心建议： 不宜独立创业或过度扩张！一旦涉足高杠杆投资极易遭遇资金链断裂。建议掌握一门扎实的专业手艺或行政技能，在体制内或稳定机构凭薪资安身立命，戒绝投机心理。', '早年极易受朋友、下属拖累财务，或在家族资产的争夺中处于下风。');
      } else if (sfStars.includes('擎羊') || sfStars.includes('陀罗')) {
        addResult('【贪武同行格】 大器晚成格', 2, 'B', '受阻 / 极度劳碌', '呈现‘百炼成钢’与‘少小离家老大回’的典型特征。核心建议： 早中年时期必经历极高的工作强度与财务压力。切勿气馁，这是夯实基础的必经之路。建议坚定深耕单一行业，积累核心客户与技术，中年后必能实现财务的稳步攀升。', '人际交往应以务实利益为导向，避免过度感情用事。');
      } else if (hasLu(curP, palaces, i) && (sfStars.includes('火星') || sfStars.includes('铃星'))) {
        const isAdv = ['财帛宫', '官禄宫'].includes(pName);
        addResult('【贪武同行格】 大器晚成格', 8, 'C', '成格 / 将星暴发', '兼具坚韧的抗压能力与捕捉时代风口的极高敏锐度。核心建议： 在30至35岁之后，极易在金融运作、实体制造或新兴产业中捕捉到巨大的时代红利。请保持对市场的敏锐度，一旦认准目标，以雷霆手段介入，有望实现财务阶层的跨越。', '中晚年方能结识手握重资的合伙人或得到得力下属。', isAdv ? "财富积累先抑后扬，中晚年极易执掌大额现金流或企业财权。" : "", isAdv);
      }
    }

    // ==========================================
    // 🟢 06. 【七杀朝斗格】 独立统御格
    // ==========================================
    if (cStars.includes('七杀') && (branchName === '寅' || branchName === '申')) {
      if (!hasLu(curP, palaces, i) && (sfStars.includes('地空') || sfStars.includes('地劫') || sfBadCount >= 3)) {
        addResult('【七杀朝斗格】 独立统御格', -3, 'A', '破格 / 孤立无援', '具备极强的开创野心，但缺乏实质性的资源支持，呈现‘孤将断粮’之象。核心建议： 一生切忌冲动创业或独自承担重大财务风险！您极易因盲目自信而孤军深入，导致满盘皆输。最佳出路是依托成熟的大型平台，担任纯技术型或执行型骨干，规避决策风险。', '人际关系易趋于孤立，易受外界强势势力的强力排挤。');
      } else if (sfBadCount > 0 || !hasLu(curP, palaces, i)) {
        addResult('【七杀朝斗格】 独立统御格', 2, 'B', '受阻 / 独木难支', '执行力极强，但凡事需事必躬亲，缺乏得力下属分担。核心建议： 事业推进过程极其艰辛，外界助力有限。极其适合从事重资产运营、安保、工程建设等需要硬性抗压能力的岗位。只要坚持到底，最终能在业内确立不可替代的专业地位。', '外部环境充满变数与高强度竞争。');
      } else {
        const isAdv = ['迁移宫', '官禄宫'].includes(pName);
        addResult('【七杀朝斗格】 独立统御格', 8, 'C', '成格 / 掌权立威', '兼具极强的宏观把控能力与微观执行力，资源与团队配置齐备。核心建议： 您天生具备跨国企业高管或大区总监的潜质。宜在大型组织中独立负责核心业务板块，放权管理，以绩效考核团队，必能掌实权并创造辉煌业绩。', '在外能独当一面，且合伙人具有极强的执行力与资本实力。', isAdv ? "极利外出或涉外发展，在外能迅速打开局面慑服竞争对手；职场不畏艰难。" : "", isAdv);
      }
    }

    // ==========================================
    // 🟢 07. 【机月同梁格】 幕僚高管格
    // ==========================================
    if (sfStars.includes('天机') && sfStars.includes('太阴') && sfStars.includes('天同') && sfStars.includes('天梁')) {
      if (hasJi(curP, palaces, i) || sfBadCount >= 3) {
        addResult('【机月同梁格】 幕僚高管格', -2, 'A', '破格 / 心机枉然', '心思细腻且极具谋略，但受化忌与重煞影响，易陷入过度精算或职场内耗。核心建议： 切忌参与复杂的职场政治站队。防范因算计过多导致的神经衰弱或人际关系崩盘。建议放下对短期利益的执念，专精一门硬核技术以技傍身最为稳妥。', '需防范合伙人/亲友间斤斤计较、暗中算计，健康上需高度关注神经系统失调。');
      } else if (sfBadCount >= 1) {
        addResult('【机月同梁格】 幕僚高管格', 2, 'B', '受阻 / 基层操劳', '具备优秀的行政统筹与企划能力，但凡事需亲力亲为，属于典型的技术官僚。核心建议： 您的收益与地位建立在极高的操心程度之上。适合在大型机构、政府部门担任中层管理或核心业务骨干。保持耐心，按部就班积累资历，收入将极其稳定。', '环境具有精打细算、按部就班的特征。');
      } else {
        const isAdv = ['官禄宫', '财帛宫'].includes(pName);
        addResult('【机月同梁格】 幕僚高管格', 6, 'C', '成格 / 幕僚高管', '兼具宏观战略眼光与微观落地能力，属顶级的‘智库’配置。核心建议： 非常适合担任企业高管、高级咨询顾问或政府政务官。无需亲自冲锋陷阵，您的核心价值在于运筹帷幄、制定规则。妥善经营人脉，您的智慧将转化为极高的社会地位。', '能结识极具智慧的良师益友，或长辈能提供极佳的教育资源。', isAdv ? "极度得位！职场极其稳定，多服务于体制内、国企或制度完善的大型平台。" : "", isAdv);
      }
    }

    // ==========================================
    // 🟢 08. 【巨日同宫格】 跨界传名格
    // ==========================================
    if (cStars.includes('太阳') && cStars.includes('巨门') && (branchName === '寅' || branchName === '申')) {
      if ((branchName === '申' && hasJi(curP, palaces, i)) || sfStars.includes('地空') || sfStars.includes('地劫') || sfStars.includes('擎羊')) {
        addResult('【巨日同宫格】 跨界传名格', -4, 'A', '破格 / 是非诉讼', '表达欲极强，但受化忌与重煞蒙蔽，极易因言语不当或信息误差引发严重纠纷。核心建议： 事业与财务上需高度防范涉外合规风险或合同违约诉讼。绝不可在公众场合发表偏激言论。遇争议宜低调冷处理，‘沉默是金’是化解此局的最佳策略。', '外部人际多口舌是非，易卷入朋友或家族的利益争吵中，需保持适当社交距离。');
      } else if (sfBadCount > 0 && !hasJi(curP, palaces, i)) {
        addResult('【巨日同宫格】 跨界传名格', 2, 'B', '受阻 / 奔波求生', '具备较强的跨界沟通能力，但事业推进伴随高强度的奔波与口舌竞争。核心建议： 您的成就建立在频繁的沟通、谈判或外勤之上。建议深造外语或专业演讲能力，通过‘动口生财’。面对同行竞争时保持平常心，视阻力为专业度的磨刀石。', '事业推进伴随高强度的奔波与竞争。');
      } else {
        const isAdv = ['迁移宫', '官禄宫'].includes(pName);
        addResult('【巨日同宫格】 跨界传名格', branchName==='寅'?8:4, 'C', '成格 / 跨界传名', '光芒发散，说服力与感染力极强，能在特定领域建立广泛知名度。核心建议： 建议向法律、教育、跨国贸易或传媒领域发展。妥善经营个人品牌与公众声誉，您的专业见解与跨界资源将为您带来丰厚的名利回报。', '外围环境多具外向、雄辩、跨文化特质，交友广阔且多有社会地位。', isAdv ? "极利向外拓展，在外易得异族/异地贵人相助，名声远播。" : "", isAdv);
      }
    }

    // ==========================================
    // 🟢 09. 【阳梁昌禄格】 权威科甲格
    // ==========================================
    if (sfStars.includes('太阳') && sfStars.includes('天梁') && sfStars.includes('文昌') && hasLu(curP, palaces, i)) {
      if (hasJi(curP, palaces, i) && (sfStars.includes('地空') || sfStars.includes('地劫'))) {
        addResult('【阳梁昌禄格】 权威科甲格', -2, 'A', '破格 / 纸上谈兵', '理论知识丰富，但受空忌破坏，知识难以转化为实际收益，易流于清高与不切实际。核心建议： 切勿陷入考证或死读书的内耗中。防范因固执己见而错失商业良机。建议将理论落地，学习一门能即刻变现的实用技能，降低对‘虚名’的执念。', '父母管教过于刻板教条，或朋友多为理论派缺乏实际互助能力。');
      } else if (sfBadCount > 0) {
        addResult('【阳梁昌禄格】 权威科甲格', 3, 'B', '受阻 / 考证迟滞', '具备专业学习能力，但学术或晋升之路必有波折。核心建议： 在升学、考编或职称评定时，易遇发挥失常或经历波折。坚持深耕医疗、工程、法务审计等需要‘硬核资格证’的领域。获取核心资质虽迟，但终将成为您安身立命的基石。', '学术或考证之路迟滞。');
      } else {
        const isAdv = ['命宫', '官禄宫'].includes(pName);
        addResult('【阳梁昌禄格】 权威科甲格', 9, 'C', '成格 / 权威科甲', '学习与研究能力卓越，属国家级、机构级栋梁之才配置。核心建议： 极其适合在学术界、医疗体系、国家部委或高科技研发领域发展。请坚定考取更高学历或申请核心专利，‘知识产权’与‘体制内权威’将为您带来极其优渥的待遇与地位。', '长辈教育素养极高，或能结交具有深厚专业背景的良师益友。', isAdv ? "职场升迁考试极速通关，非常适合公职、科研机构或垄断型国企。" : "", isAdv);
      }
    }

    // ==========================================
    // 🟢 10. 【明珠出海格】 资源整合格
    // ==========================================
    if (branchName === '未' && isCurEmpty && oStars.includes('天同') && oStars.includes('巨门') && (getStars(trA).includes('太阳') || getStars(trB).includes('太阳'))) {
      if (cStars.includes('地空') || cStars.includes('地劫') || hasMutagen(oppP, palaces, i, '忌')) {
        addResult('【明珠出海格】 资源整合格', -3, 'A', '破格 / 明珠蒙尘', '内心具备丰富的创意与才华，但受外部深渊压制，极易产生怀才不遇的抑郁感。核心建议： 建议降低对世俗名利的执念。您需要一个极度包容的工作环境，将您的才华释放在艺术、文学或幕后研发中，避免参与高强度的商业利益争夺，以防心神俱损。', '外部资源看似宏大实则虚浮无力，甚至易遭遇隐蔽的背叛。');
      } else if (sfBadCount > 0) {
        addResult('【明珠出海格】 资源整合格', 3, 'B', '受阻 / 晚发才华', '典型的‘大器晚成’与‘底层逆袭’结构。核心建议： 早中期的职业生涯可能默默无闻，甚至备受打压。但在经验积累后，您隐藏的才华与人脉资源将逐步释放。适合从事自媒体、设计研发、演艺等具高度个人IP属性的行业，耐心是破局的关键。', '早中期资源受阻，坚持可逆袭。');
      } else {
        const isAdv = ['迁移宫', '命宫'].includes(pName);
        addResult('【明珠出海格】 资源整合格', 8, 'C', '成格 / 资源整合', '具备极强的环境适应力与资源整合能力，属平地起高楼的绝佳配置。核心建议： 本宫无主星意味着您能‘海纳百川’。您极其擅长借力打力，整合外部优异的资源为己所用。宜从事跨界统筹、大型项目管理或平台运营，名利双收。', '能得到社会贤达、隐形富豪或优质长辈的暗中栽培与提携。', isAdv ? "涉外发展尤为吉利，主在外能得极佳口碑，左右逢源。" : "", isAdv);
      }
    }

    // ==========================================
    // 🟢 11. 【日月并明/夹命格】 左右逢源格
    // ==========================================
    if ((sfStars.includes('太阳') && sfStars.includes('太阴') && branchName === '未') || (prevStars.includes('太阳') && nextStars.includes('太阴')) || (prevStars.includes('太阴') && nextStars.includes('太阳'))) {
      if (isCurEmpty && (cStars.includes('地空') || cStars.includes('地劫') || sfStars.includes('地空'))) {
        addResult('【日月并明/夹命格】 左右逢源格', -3, 'A', '破格 / 虚名虚利', '外部资源看似极其优越，但自身底盘不稳且受空劫吞噬，呈现‘空壳’之象。核心建议： 切忌打肿脸充胖子或过度依赖他人的承诺。一生绝不可涉足缺乏实体支撑的金融传销或包装过度的加盟项目。脚踏实地，摒弃虚荣心，方能避免重大财务崩塌。', '父母缘分较薄，或交友圈中多趋炎附势之徒，外表光鲜内里缺乏互助。');
      } else if (sfBadCount > 0) {
        addResult('【日月并明/夹命格】 左右逢源格', 2, 'B', '受阻 / 披星戴月', '属于典型的‘披星戴月、劳碌求财’格。核心建议： 虽有一定贵人扶持，但您的资源往往需要付出极大的体力或心力去交换。适合从事早出晚归、跨越时区（如物流、国际贸易、24小时服务业）的行业。过程虽苦，但终能夯实家业。', '劳心劳力，付出方有回报。');
      } else {
        const isAdv = ['命宫', '夫妻宫'].includes(pName);
        addResult('【日月并明/夹命格】 左右逢源格', 7, 'C', '成格 / 左右逢源', '得天独厚，长辈缘与上司缘极佳，属少年得志的配置。核心建议： 犹如拥有‘金钟罩’，您极易在早青年时期获得高层领导的破格提拔或掌握核心社会资源。请在合规的前提下，大胆进入高规格的社交圈展现自身，外部资源将为您铺平道路。', '父母双全且有社会地位，或名下拥有极其优良的不动产。', isAdv ? "极易因婚姻跨越阶层，配偶能力强且能提供极大实质性帮助。" : "", isAdv);
      }
    }

    // ==========================================
    // 🟢 12. 【君臣庆会格】 绝对领袖格
    // ==========================================
    const junChenCount = (sfStars.includes('左辅')?1:0) + (sfStars.includes('右弼')?1:0) + (sfStars.includes('天魁')?1:0) + (sfStars.includes('天钺')?1:0) + (sfStars.includes('天府')?1:0) + (sfStars.includes('天相')?1:0);
    if (cStars.includes('紫微') && junChenCount >= 4) {
      if (junChenCount < 2 && sfBadCount > 0) {
        addResult('【君臣庆会格】 绝对领袖格', -2, 'A', '破格 / 孤君暴君', '具备强烈的掌控欲，但缺乏团队支撑，且遇煞星激发，易流于刚愎自用。核心建议： 切忌实行‘一言堂’式的管理或盲目独自创业！防范因过于自我导致团队背叛或决策失误。建议学会在组织中低头，以专业技术或执行力立足，切勿强行争权。', '易结交虚荣霸道之人，或下属野心难以驾驭，需建立严密防波堤。');
      } else if (hasJi(curP, palaces, i) || sfBadCount >= 2) {
        addResult('【君臣庆会格】 绝对领袖格', 4, 'B', '受阻 / 劳心掌柜', '具备团队班底，但外部环境险恶且内部鱼龙混杂，属于实权操心者。核心建议： 您的管理地位是在烂摊子或高压环境中打拼出来的。非常适合在企业中担任救火队长、重组并购负责人或实权业务总监。事务极其繁杂，需注意防范过度劳累。', '环境高压，管理极其操心。');
      } else {
        const isAdv = ['命宫', '官禄宫'].includes(pName);
        addResult('【君臣庆会格】 绝对领袖格', 10, 'C', '成格 / 绝对领袖', '格局宏大，具备极强的领袖气场与组织调动能力。核心建议： 您无需严苛的微观管理，天然具备让团队信服与效劳的威望。适合向政界核心、商界巨头或大型组织的最高决策层迈进。请将精力集中于宏观战略与核心资源分配。', '交游广阔，能结交政商两界顶级人脉，且下属极其得力忠诚。', isAdv ? "天生领导者，极具包容力与威严感，职场统御力极强。" : "", isAdv);
      }
    }

    // ==========================================
    // 🟢 13. 【府相朝垣格】 稳固财库格
    // ==========================================
    if (!cStars.includes('紫微') && sfStars.includes('天府') && sfStars.includes('天相')) {
      if (!hasLu(curP, palaces, i) && (sfStars.includes('地空') || sfStars.includes('地劫'))) {
        addResult('【府相朝垣格】 稳固财库格', -3, 'A', '破格 / 财库见空', '天府天相本主衣食无忧与极佳的理财概念，但受空劫洗劫，呈现‘空库’之象。核心建议： 极度注重生活品质与体面，但容易陷入透支或高负债陷阱。一生严禁触碰民间借贷、高杠杆炒房或盲目担保。务必缩减非必要开支，建立强制储蓄习惯，以防资金链断裂。', '外部机构看似庞大实则虚空，合作务必尽调防范空壳公司拖累。');
      } else if (sfBadCount > 0) {
        addResult('【府相朝垣格】 稳固财库格', 3, 'B', '受阻 / 过路财神', '具备优秀的商业头脑与服务意识，但资金流转频繁，难以大量沉淀。核心建议： 极适合担任财务总监、银行高管或在企业中协助一把手管账（二把手哲学）。替机构理财往往能获利颇丰，但独立操盘企业极易遭遇流动性枯竭。‘老二哲学’是您的职场护身符。', '资金流转极快，防范流动性枯竭。');
      } else {
        const isAdv = ['财帛宫', '官禄宫'].includes(pName);
        addResult('【府相朝垣格】 稳固财库格', 8, 'C', '成格 / 稳固财库', '格局气势通畅，财库充盈，具备极高的抗风险与资金运作能力。核心建议： 不仅具备极强的吸金能力，更深谙‘守财’之道。在任何经济周期下均能保持稳健。建议配置优质不动产、实体连锁或家族信托基金，财富有望实现稳步的跨代际积累。', '极易获得实力雄厚的长辈或合伙人的实质性资金背书。', isAdv ? "财务状况极其稳健，一生不愁现金流，利于长线价值投资。" : "", isAdv);
      }
    }

    // ==========================================
    // 🟢 14. 【双禄朝垣格】 源源不绝格
    // ==========================================
    const luCount = (sfStars.includes('禄存')?1:0) + (hasMutagen(curP,palaces,i,'禄')?1:0) + (hasMutagen(trA,palaces,(i+4)%12,'禄')?1:0) + (hasMutagen(trB,palaces,(i+8)%12,'禄')?1:0) + (hasMutagen(oppP,palaces,(i+6)%12,'禄')?1:0);
    if (luCount >= 2) {
      if (sfStars.includes('地空') || sfStars.includes('地劫')) {
        addResult('【双禄朝垣格】 源源不绝格', -4, 'A', '破格 / 禄随空亡', '本具极其优渥的获利渠道，但双禄被空劫吞噬，主财富大起大落、财来财去。核心建议： 您具备赚取大额资金的能力，但极易因错误的投资或轻信他人而瞬间亏空。一旦获得大额收益，请立即转化为不动产或信托，手头保留大量现金必遭无端消耗。', '防范身边人对您的财产虎视眈眈，切勿发生大额借贷。');
      } else if (sfStars.includes('擎羊') || sfStars.includes('陀罗') || hasJi(curP, palaces, i)) {
        addResult('【双禄朝垣格】 源源不绝格', 3, 'B', '受阻 / 因财招妒', '财源滚滚，但在获利过程中伴随极高的争议、竞争或游走于规则边缘。核心建议： 财富的积累多带有‘虎口拔牙’的性质，极易引发同行眼红或暗箭伤人。切忌一毛不拔，赚到钱后务必懂得利益均沾，主动纳税并多做公益，方能化解因财生灾的隐患。', '利益均沾方能化解招妒。');
      } else {
        const isAdv = ['财帛宫', '迁移宫'].includes(pName);
        addResult('【双禄朝垣格】 源源不绝格', 9, 'C', '成格 / 源源不绝', '吸金能力极其强悍，且多渠道进财，属顶级的财富格局。核心建议： 具备敏锐的商业嗅觉与极佳的变现能力（工资+投资+被动收入）。建议大胆涉足金融、跨国商贸或高现金流生意。财富雪球将越滚越大，宜尽早搭建企业架构走向正规化。', '配偶或合伙人自带丰厚资本，能为您提供极大的资金注入。', isAdv ? "终生不缺赚钱门路，动中生财，极其适合跨地发展或进出口贸易。" : "", isAdv);
      }
    }

    // ==========================================
    // 🟢 15. 【三奇加会格】 顺风顺水格
    // ==========================================
    if (hasLu(curP, palaces, i) && hasQuan(curP, palaces, i) && hasKe(curP, palaces, i)) {
      if (hasJi(curP, palaces, i) && sfBadCount >= 3) {
        addResult('【三奇加会格】 顺风顺水格', -2, 'A', '破格 / 华而不实', '本具极佳的才华与外部机遇，但受忌煞引爆，易在最顶峰时因执念跌落谷底。核心建议： 您容易因阶段性的成功而产生过度自信，进而盲目扩张或触碰行业红线。必须修炼极高的合规意识与道德底线，见好就收。防范因财务纠纷或作风问题导致身败名裂。', '外部贵人雷声大雨点小，防范高层派系斗争波及自身。');
      } else if (sfBadCount > 0) {
        addResult('【三奇加会格】 顺风顺水格', 4, 'B', '受阻 / 名利伴争', '名、权、利皆有所获，但晋升与求财之路上必定伴随非议与难缠的竞争对手。核心建议： 您的成就注定伴随争议。保持强大的抗压能力，在复杂的职场斗争或商业博弈中保持清醒。妥善处理利益分配，防范暗箭伤人，稳中求胜。', '竞争环境险恶，需极强心理素质。');
      } else {
        const isAdv = ['官禄宫', '命宫'].includes(pName);
        addResult('【三奇加会格】 顺风顺水格', 10, 'C', '成格 / 顺风顺水', '天道酬勤且资源丰厚，名声、地位与财富三者兼得的完美配置。核心建议： 极其适合在学术界、医疗体系、国家部委或高科技研发领域发展。请坚定考取更高学历或申请核心专利，‘知识产权’与‘体制内权威’将为您带来极其优渥的待遇与地位。', '能结识行业泰斗、政要或顶级资本家，获益无穷。', isAdv ? "极易成为行业标杆或领军人物，政商两界皆可通达。" : "", isAdv);
      }
    }

    // ==========================================
    // 🟢 16. 【三奇朝斗格】 宏观统御格
    // ==========================================
    if (cStars.includes('紫微') && hasLu(curP, palaces, i) && hasQuan(curP, palaces, i) && hasKe(curP, palaces, i)) {
      if (hasJi(curP, palaces, i) && (sfStars.includes('地空') || sfStars.includes('地劫'))) {
        addResult('【三奇朝斗格】 宏观统御格', -3, 'A', '破格 / 德不配位', '心志极高但环境险恶，主期望与现实脱节。核心建议： 拥有极高的眼界，但时常感到怀才不遇。切忌眼高手低或盲目追求宏大叙事。建议放下身段，从基层管理做起，扎实磨练心性与抗压能力，避免因盲目扩张而遭遇滑铁卢。', '高层贵人难以真正触达，易被高层权力的更迭波及，谨慎站队。');
      } else if (sfBadCount > 0) {
        addResult('【三奇朝斗格】 宏观统御格', 5, 'B', '受阻 / 奋斗霸主', '具备强大的统御力与资源，但事业版图是经过激烈的斗争打拼而来。核心建议： 在攀登高位的过程中必会经历数次残酷的行业洗牌。保持钢铁般的意志，妥善处理复杂的利益分配。您的地位是在解决一个又一个棘手危机中确立的。', '大局在握，但多生斗争。');
      } else {
        const isAdv = ['命宫'].includes(pName);
        addResult('【三奇朝斗格】 宏观统御格', 12, 'C', '成格 / 顶级显贵', '紫微斗数中站在绝对塔尖的帝王级配置。核心建议： 财富对您而言只是基础，您注定要承担更大的社会责任或制定行业规则。在合法合规的前提下，请毫无顾忌地去攀登政界、商界或学术界的最高峰，您具备极高的历史性成就潜能。', '能结识行业泰斗、政要或顶级资本家，获益无穷。', isAdv ? "自身气局宏大，天生自带令人信服的威严，一生易得重用。" : "", isAdv);
      }
    }

    // ==========================================
    // 🔴 17. 【刑忌夹印格】 腹背受敌格
    // ==========================================
    if (cStars.includes('天相')) {
      const isJia = (hasJi(prevP, palaces, (i+11)%12) && (nextStars.includes('天梁') || nextStars.includes('擎羊'))) || 
                    (hasJi(nextP, palaces, (i+1)%12) && (prevStars.includes('天梁') || prevStars.includes('擎羊')));
      if (isJia) {
        let branch: 'A'|'B'|'C' = 'C';
        let score = -7;
        let summary = ""; let advice = "";
        let supplementaryAdvice = "格局影响提示： 外部环境对您充满了压迫感与束缚。成格（分支C）主原生家庭（父母宫）或合伙人（交友宫）极度强势且多官非纠纷，极易拖累命主；化解（分支A/B）则主虽出身或合作环境恶劣，但最终能与对方达成和解或成功完成切割。";

        if (hasLu(curP, palaces, i) || hasQuan(curP, palaces, i) || hasKe(curP, palaces, i)) {
          branch = 'A'; score = 2; summary = "化险为夷，夹处逢生";
          advice = "外界环境极其高压（夹击），但自身抗风险能力极强，能化被动为主动。危机即转机！您极其适合处理高难度的纠纷、不良资产重组或企业危机公关。在极端恶劣的环境中，您总能凭借过硬的专业能力力挽狂澜。";
        } else if (sfStars.includes('左辅') || sfStars.includes('天魁')) {
          branch = 'B'; score = -3; summary = "苦撑待变，两头受气";
          advice = "常有‘夹在中间两头受气’的憋屈感，易背黑锅，但关键时刻有贵人疏通。签署任何合同、担任财务担保人时，务必核对三遍以上！极易因轻信他人而承担连带责任。";
        } else {
          branch = 'C'; score = -7; summary = "腹背受敌，替罪羔羊";
          advice = "印绶（信用/职权）遭到严重破坏，属于典型的‘替罪羔羊’配置。一生绝不可为任何人做财务担保！绝不可触碰任何财务合规红线！若发现所在企业存在严重的违规操作，请立即辞职防范被推出来顶罪。";
        }

        let finalScore = Math.max(-8, Math.min(8, score * calculatePurity()));
        results.push({
          palaceIndex: i, palaceName: curP.name, patternName: '【刑忌夹印格】 腹背受敌格',
          type: score > 0 ? '吉' : '凶', finalScore: Number(finalScore.toFixed(1)), branch, summary, 
          advice, isInnerPalace: isInner, supplementaryAdvice, isAdvantage: pName === '官禄宫',
          advantageText: pName === '官禄宫' ? "职场中极易遭遇复杂的派系斗争或不公正的背锅事件，宜从事纪检、审计等本身自带“刑忌”性质的职业以毒攻毒。" : "",
          showInDashboard: finalScore >= 5 && isInner
        });
      }
    }

    // ==========================================
    // 🔴 18. 【铃昌陀武格】 绝境水厄格
    // ==========================================
    if (sfStars.includes('铃星') && sfStars.includes('文昌') && sfStars.includes('陀罗') && sfStars.includes('武曲')) {
      let branch: 'A'|'B'|'C' = 'C';
      let score = -10;
      let summary = ""; let advice = "";
      let supplementaryAdvice = "格局影响提示： 红色绝命预警！财务与身心皆面临毁灭性的打击风险。成格（分支C）主财务与身心皆面临毁灭性打击；化解（分支A/B）则需极高的抗压能力或果断的止损意识。";

      if (hasLu(curP, palaces, i) || sfStars.includes('天梁(科)') || sfStars.some(s => s.includes('化科'))) {
        branch = 'A'; score = 2; summary = "完美化解，绝处逢生";
        advice = "曾经历或潜伏着极其严重的财务/事业危机，但凭借雄厚的资金底盘或极高的智慧得以化解。从危机中生还赋予了您常人难以企及的胆识与风控经验。此劫过后，事业将涅槃重生。";
      } else if (sfStars.includes('紫微') || sfStars.includes('天府')) {
        branch = 'B'; score = -3; summary = "割肉止损，勉强脱身";
        advice = "遭遇重大挫折时，虽能勉强脱身，但必然会伤筋动骨。在投资或事业推进中，一旦发现项目陷入泥潭或亏损触及红线，必须立刻果断止损！严禁抱有‘追加筹码就能回本’的赌徒心理。";
      } else {
        branch = 'C'; score = -10; summary = "绝境水厄，毁灭性打击";
        advice = "极易因文书失误、合同诈骗、支票跳票或极端的杠杆投资导致彻底清算。一生严禁涉足股市、期货及高利贷。将核心资产交予信任的家人保管，防范水上及金属意外。";
      }

      let finalScore = Math.max(-8, Math.min(8, score * calculatePurity()));
      results.push({
        palaceIndex: i, palaceName: curP.name, patternName: '【铃昌陀武格】 绝境水厄格',
        type: score > 0 ? '吉' : '凶', finalScore: Number(finalScore.toFixed(1)), branch, summary, 
        advice, isInnerPalace: isInner, supplementaryAdvice, isAdvantage: false,
        showInDashboard: finalScore >= 5 && isInner
      });
    }

    // ==========================================
    // 🔴 19. 【羊陀夹忌格】 窒息深渊格
    // ==========================================
    if (hasJi(curP, palaces, i) && (prevStars.includes('擎羊') && nextStars.includes('陀罗') || prevStars.includes('陀罗') && nextStars.includes('擎羊'))) {
      let branch: 'A'|'B'|'C' = 'C';
      let score = -8;
      let summary = ""; let advice = "";
      let supplementaryAdvice = "格局影响提示： 一生最憋屈的窒息级凶格。该宫位代表的领域，将成为消耗您一生的无底洞。成格（分支C）主不断压榨财务与精力；化解（分支A/B）则需极强的意志力或主动放权。";

      if ((cStars.includes('紫微') || cStars.includes('七杀')) && sfBadCount === 0) {
        branch = 'A'; score = -2; summary = "完美化解，冲破牢笼";
        advice = "内心犹如被重兵围困的孤城，但凭借极强悍的个人意志与外部吉运，能强行突围。您对特定目标有极深的执念。破局的唯一方法是：主动放权与舍弃！ 将紧抓在手的利益主动分流，‘破财消灾’方能打破枷锁。";
      } else if (sfStars.includes('左辅') || sfStars.includes('天魁')) {
        branch = 'B'; score = -5; summary = "精神内耗，作茧自缚";
        advice = "呈现严重的‘作茧自缚’状态，精神与现实皆感困顿。追求完美的性格导致了极度的内耗。您往往在无关紧要的细节上消耗了大量精力。建议降低心理预期，接受‘不完美也是常态’，寻找专业心理疏导。";
      } else {
        branch = 'C'; score = -8; summary = "窒息深渊，无底洞";
        advice = "越挣扎陷得越深！面对该领域的挫折，唯一的解药是‘彻底躺平与放手’。绝对不要在这个领域与人攀比或强求，转而将精力投入其他顺遂维度。";
      }

      let finalScore = Math.max(-8, Math.min(8, score * calculatePurity()));
      results.push({
        palaceIndex: i, palaceName: curP.name, patternName: '【羊陀夹忌格】 窒息深渊格',
        type: score > 0 ? '吉' : '凶', finalScore: Number(finalScore.toFixed(1)), branch, summary, 
        advice, isInnerPalace: isInner, supplementaryAdvice, isAdvantage: false,
        showInDashboard: finalScore >= 5 && isInner
      });
    }

    // ==========================================
    // 🔴 20. 【巨火擎羊格】 烈火是非格
    // ==========================================
    if (sfStars.includes('巨门') && sfStars.includes('火星') && sfStars.includes('擎羊')) {
      let branch: 'A'|'B'|'C' = 'C';
      let score = -7;
      let summary = ""; let advice = "";
      let supplementaryAdvice = "格局影响提示： 典型的‘祸从口出’与高危法律纠纷结构。成格（分支C）主严重的官非争端；化解（分支A/B）则需极高的情绪管理能力或犀利的专业辩论能力。";

      if (hasLu(curP, palaces, i) || hasQuan(curP, palaces, i) && !hasJi(curP, palaces, i)) {
        branch = 'A'; score = 2; summary = "化险为夷，权威舌战";
        advice = "言辞极其犀利且具穿透力，能将煞气转化为强悍的说服力。极度适合从事法律诉讼、外交谈判、危机公关或需要高强度辩论的商业岗位。在激烈的职场交锋中，您总能占据上风并以此生财，但仍需注意得理且饶人。";
      } else if (sfStars.includes('左辅') || sfStars.includes('天魁')) {
        branch = 'B'; score = -3; summary = "口硬心软，无意得罪";
        advice = "行事火爆，沟通方式过于直接，易在无意中得罪他人。您的出发点往往是善意的，但表达方式容易引发反感。建议在职场与生活中修炼情绪管理，凡事‘深呼吸十秒后再作答’。";
      } else {
        branch = 'C'; score = -7; summary = "官非争端，祸从口出";
        advice = "极易因一时冲动、网络发帖或激烈的路怒症，导致自身陷入严重的官司乃至人身伤害。一生务必谨言慎行，绝不可参与任何带有煽动性的是非争论，防范小人借题发挥。";
      }

      let finalScore = Math.max(-8, Math.min(8, score * calculatePurity()));
      results.push({
        palaceIndex: i, palaceName: curP.name, patternName: '【巨火擎羊格】 烈火是非格',
        type: score > 0 ? '吉' : '凶', finalScore: Number(finalScore.toFixed(1)), branch, summary, 
        advice, isInnerPalace: isInner, supplementaryAdvice, isAdvantage: false,
        showInDashboard: finalScore >= 5 && isInner
      });
    }

    // ==========================================
    // 🔴 21. 【极居卯酉格】 物欲交战格
    // ==========================================
    if (cStars.includes('紫微') && cStars.includes('贪狼') && (branchName === '卯' || branchName === '酉')) {
      let branch: 'A'|'B'|'C' = 'C';
      let score = -6;
      let summary = ""; let advice = "";
      let supplementaryAdvice = "格局影响提示： 理智极易被过度的物欲或不良嗜好所蒙蔽。成格（分支C）主贪欲倾败；化解（分支A/B）则需极高的审美能力或精神追求。";

      if (hasLu(curP, palaces, i) && (sfStars.includes('左辅') && sfStars.includes('右弼'))) {
        branch = 'A'; score = 2; summary = "化险为夷，艺术变现";
        advice = "拥有极佳的品味、审美与长袖善舞的人际交往能力，且懂得自我克制。适合从事高端服务业、奢侈品管理、艺术公关或演艺事业。您能巧妙利用自身的魅力与社交资源作为事业跳板，在复杂的商业应酬中游刃有余。";
      } else if (sfStars.includes('地空') || sfStars.includes('华盖')) {
        branch = 'B'; score = -2; summary = "出世入世，精神寄托";
        advice = "出世的哲思与入世的欲望在内心反复博弈。潜意识中具有强烈的探索欲，容易被哲学、心理学或玄学吸引。早年可能经历过情感波折，建议将精力转移至精神层面的修行或专业学术的研究上，以平息内心的躁动。";
      } else {
        branch = 'C'; score = -6; summary = "贪欲倾败，身败名裂";
        advice = "一生极易因过度沉迷娱乐、不良财务杠杆或复杂的男女关系而导致身败名裂。必须建立极高的道德标准与合规意识，绝不涉足高危的声色场所与投机圈子。";
      }

      let finalScore = Math.max(-8, Math.min(8, score * calculatePurity()));
      results.push({
        palaceIndex: i, palaceName: curP.name, patternName: '【极居卯酉格】 物欲交战格',
        type: score > 0 ? '吉' : '凶', finalScore: Number(finalScore.toFixed(1)), branch, summary, 
        advice, isInnerPalace: isInner, supplementaryAdvice, isAdvantage: false,
        showInDashboard: finalScore >= 5 && isInner
      });
    }
  }

  return results.sort((a, b) => Math.abs(b.finalScore) - Math.abs(a.finalScore));
}
