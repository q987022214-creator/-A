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
}

const getStars = (palace: any) => {
  const stars: string[] = [];
  if (palace.majorStars) palace.majorStars.forEach((s: any) => stars.push(s.name));
  if (palace.minorStars) palace.minorStars.forEach((s: any) => stars.push(s.name));
  return stars;
};

// 严谨检测：只认生年忌 + 离心/向心自化忌，彻底排除流年大限飞星干扰
const hasJi = (palace: any, palaces: any[], currentIndex: number) => {
  let ji = false;
  const stars = getStars(palace);
  
  const checkMutagen = (s: any) => { if (s.mutagen === '忌') ji = true; };
  if (palace.majorStars) palace.majorStars.forEach(checkMutagen);
  if (palace.minorStars) palace.minorStars.forEach(checkMutagen);
  
  const myStem = palace.heavenlyStem;
  const oppStem = palaces[(currentIndex + 6) % 12].heavenlyStem;
  
  (STEM_MUTAGENS[myStem] || []).forEach(t => { if (stars.includes(t.star) && t.mutagen === '忌') ji = true; });
  (STEM_MUTAGENS[oppStem] || []).forEach(t => { if (stars.includes(t.star) && t.mutagen === '忌') ji = true; });

  return ji;
};

// 严谨检测：只认生年禄 + 离心/向心自化禄 + 禄存
const hasLu = (palace: any, palaces: any[], currentIndex: number) => {
  let lu = false;
  const stars = getStars(palace);
  if (stars.includes('禄存')) lu = true;
  
  const checkMutagen = (s: any) => { if (s.mutagen === '禄') lu = true; };
  if (palace.majorStars) palace.majorStars.forEach(checkMutagen);
  if (palace.minorStars) palace.minorStars.forEach(checkMutagen);
  
  const myStem = palace.heavenlyStem;
  const oppStem = palaces[(currentIndex + 6) % 12].heavenlyStem;
  
  (STEM_MUTAGENS[myStem] || []).forEach(t => { if (stars.includes(t.star) && t.mutagen === '禄') lu = true; });
  (STEM_MUTAGENS[oppStem] || []).forEach(t => { if (stars.includes(t.star) && t.mutagen === '禄') lu = true; });

  return lu;
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
    const prevP = palaces[(i + 11) % 12]; 
    const nextP = palaces[(i + 1) % 12];  

    const pNameRaw = curP.name || '';
    const pName = pNameRaw.endsWith('宫') ? pNameRaw : pNameRaw + '宫';

    const cStars = getStars(curP);
    const oStars = getStars(oppP);
    const sfStars = [...cStars, ...oStars, ...getStars(trA), ...getStars(trB)];
    
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

    // ==========================================
    // 🟢 01. 【火贪格 / 铃贪格】
    // ==========================================
    if (cStars.includes('贪狼') && (cStars.includes('火星') || cStars.includes('铃星') || oStars.includes('火星') || oStars.includes('铃星'))) {
      let branch: 'A'|'B'|'C' = 'C';
      let score = 6;
      let summary = ""; let advice = "";
      let supplementaryAdvice = "格局影响提示： 您的外部人际环境或内在情绪呈现“突变、快节奏”的特征。成格（分支C）主易在偶然间结识具有爆发潜力的合伙人/朋友，或房产有突发增值之机；破格（分支A/B）则需高度警惕突发性的财务消耗，严防因亲友借贷、合伙投资带来的瞬间破财，在健康（疾厄）上需留意突发性的急性炎症。";

      if (sfStars.includes('地空') || sfStars.includes('地劫') || hasJi(curP, palaces, i) || sfBadCount >= 3) {
        branch = 'A'; score = -4; summary = "空忌冲破，横发横破";
        advice = "该格局本具突发之机，但遇空劫或化忌冲破，主大起大落、横发横破。核心建议： 在相关领域极易出现冲动性决策，面对高回报诱惑往往难以克制风险偏好。建议一生以稳健守成为主，严禁参与具有赌博性质或超出自身承受能力的高杠杆投资，防范资金链断裂。";
      } else if (hasJi(oppP, palaces, i) || hasJi(trA, palaces, i) || hasJi(trB, palaces, i) || sfBadCount >= 1) {
        branch = 'B'; score = 2; summary = "获利伴随激烈竞争波折";
        advice = "具备突发突破的潜力，但环境夹杂微煞，主获利或晋升过程中伴随激烈的竞争或事后波动。核心建议： 机遇多在变动与忙碌中产生。当获得阶段性成果时，务必保持低调。请预留应对突发状况的冗余准备，见好就收，避免扩大战线。";
      } else {
        branch = 'C'; score = 8; summary = "顺势突破，爆发力极强";
        advice = "气势通畅，爆发力极强，主能在特定周期内获得显著的突破性进展。核心建议： 具备较强的商业敏锐度与执行力。遇行业风口或转型期，建议果断采取行动。取得成果后，宜及时将高风险收益转化为稳固资产（如置产、定存）以夯实基础。";
      }

      let finalScore = score * calculatePurity();
      if (isCurEmpty) finalScore *= 0.7; 
      finalScore = Math.max(-8, Math.min(8, finalScore));

      const isAdv = ['财帛宫', '官禄宫'].includes(pName);
      results.push({
        palaceIndex: i, palaceName: curP.name, patternName: '【火贪/铃贪格】 突发波动格',
        type: score > 0 ? '吉' : '凶', finalScore: Number(finalScore.toFixed(1)), branch, summary, 
        advice, isInnerPalace: isInner, supplementaryAdvice, isAdvantage: isAdv,
        advantageText: isAdv ? "此格正落财帛/官禄！财富多呈阶梯式爆发跳跃。利于通过把握新兴风口或突发性业务获得丰厚收益。" : ""
      });
    }

    // ==========================================
    // 🟢 07. 【机月同梁格】
    // ==========================================
    const isJiYueTongLiang = sfStars.includes('天机') && sfStars.includes('太阴') && sfStars.includes('天同') && sfStars.includes('天梁');
    if (isJiYueTongLiang) {
      let branch: 'A'|'B'|'C' = 'C';
      let score = 4;
      let summary = ""; let advice = "";
      let supplementaryAdvice = "格局影响提示： 您的外围人际或家庭环境具有“精打细算、按部就班”的特征。成格（分支C）主能结识极具智慧的良师益友，或长辈（父母宫）能提供极佳的教育资源；破格（分支A/B）则需防范合伙人/亲友间斤斤计较、暗中算计，在健康（疾厄）上需高度关注内分泌与神经系统失调。";

      if (hasJi(curP, palaces, i) || sfBadCount >= 3) {
        branch = 'A'; score = -2; summary = "算计内耗，心机枉然";
        advice = "心思细腻且极具谋略，但受化忌与重煞影响，易陷入过度精算或职场内耗。切忌参与复杂的职场政治站队，防范因算计过多导致的神经衰弱或人际关系崩盘。专精一门硬核技术以技傍身最为稳妥。";
      } else if (sfBadCount >= 1) {
        branch = 'B'; score = 2; summary = "凡事亲力亲为，基层操劳";
        advice = "具备优秀的行政统筹与企划能力，但凡事需亲力亲为，属于典型的技术官僚。适合在大型机构、政府部门担任中层管理或核心业务骨干。保持耐心，按部就班积累资历，收入将极其稳定。";
      } else {
        branch = 'C'; score = 6; summary = "运筹帷幄，幕僚高管";
        advice = "兼具宏观战略眼光与微观落地能力，属顶级的‘智库’配置。非常适合担任企业高管、高级咨询顾问或政府政务官。无需亲自冲锋陷阵，您的核心价值在于运筹帷幄、制定规则。";
      }

      let finalScore = Math.max(-8, Math.min(8, score * calculatePurity()));
      if (isCurEmpty) finalScore *= 0.7;
      
      const isAdv = pName === '官禄宫';
      results.push({
        palaceIndex: i, palaceName: curP.name, patternName: '【机月同梁格】 幕僚高管格',
        type: score > 0 ? '吉' : '凶', finalScore: Number(finalScore.toFixed(1)), branch, summary, 
        advice, isInnerPalace: isInner, supplementaryAdvice, isAdvantage: isAdv,
        advantageText: isAdv ? "极度得位！职场极其稳定，多服务于体制内、国企或制度完善的大型平台，擅长行政与企划。" : ""
      });
    }

    // ==========================================
    // 🔴 16. 【刑忌夹印格】
    // ==========================================
    if (cStars.includes('天相')) {
      const prevStars = getStars(prevP);
      const nextStars = getStars(nextP);
      const isJia = (hasJi(prevP, palaces, (i+11)%12) && (nextStars.includes('天梁') || nextStars.includes('擎羊'))) || 
                    (hasJi(nextP, palaces, (i+1)%12) && (prevStars.includes('天梁') || prevStars.includes('擎羊')));
      
      if (isJia) {
        let branch: 'A'|'B'|'C' = 'C';
        let score = -7;
        let summary = ""; let advice = "";
        let supplementaryAdvice = "格局影响提示： 外部环境对您充满了压迫感与束缚。成格（分支C）主原生家庭（父母宫）或合伙人（交友宫）极度强势且多官非纠纷，极易拖累命主；化解（分支A/B）则主虽出身或合作环境恶劣，但最终能与对方达成和解或成功完成切割。";

        if (hasLu(curP, palaces, i)) {
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
          advantageText: pName === '官禄宫' ? "职场中极易遭遇复杂的派系斗争或不公正的背锅事件，宜从事纪检、审计等本身自带“刑忌”性质的职业以毒攻毒。" : ""
        });
      }
    }

    // ==========================================
    // 🔴 22. 【命无正曜格】
    // ==========================================
    if (pName === '命宫' && isCurEmpty) {
      let branch: 'A'|'B'|'C' = 'C';
      let score = -5;
      let summary = ""; let advice = "";
      let supplementaryAdvice = "格局影响提示： 该宫位代表的领域缺乏稳固的内部支撑。如在交友宫，主员工流动性极大；在田宅宫，主不易继承祖产。需重点依托对宫（该外宫的外部环境）来进行弥补，不可在该领域产生过度依赖。";

      if (hasLu(oppP, palaces, (i+6)%12) && !hasJi(oppP, palaces, (i+6)%12) && sfBadCount === 0) {
        branch = 'A'; score = 5; summary = "海纳百川，平台借势";
        advice = "命宫犹如一个超级容器，具备极强的环境适应力与资源整合能力。您属于典型的‘平台依赖型’与‘借势型’人才。极度适合担任高级幕僚、跨界操盘手或平台中介，整合他人资源是您的核心竞争力。";
      } else if (!hasJi(oppP, palaces, (i+6)%12)) {
        branch = 'B'; score = -2; summary = "灵活多变，随遇而安";
        advice = "性格随和，不争不抢，是个极具弹性的多面手。建议多掌握几门跨界技能，避免将事业完全绑定在单一领域。宜寻找具有强势决策力的伴侣或合伙人，由对方担任主心骨，人生将安稳顺遂。";
      } else {
        branch = 'C'; score = -7; summary = "基础薄弱，随波逐流";
        advice = "基础底盘极度薄弱，极易被恶劣的外部环境所同化 or 吞噬。一生最怕交错朋友和跟错老板！绝对禁止参与群体性的盲目投资。遇重大决策时务必听从理智长辈的建议。";
      }

      let finalScore = Math.max(-8, Math.min(8, score * calculatePurity()));
      results.push({
        palaceIndex: i, palaceName: curP.name, patternName: '【命无正曜格】 借力打力格',
        type: score > 0 ? '吉' : '凶', finalScore: Number(finalScore.toFixed(1)), branch, summary, 
        advice, isInnerPalace: isInner, supplementaryAdvice, isAdvantage: false
      });
    }
  }

  return results.sort((a, b) => Math.abs(b.finalScore) - Math.abs(a.finalScore));
}
