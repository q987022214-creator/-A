// src/utils/patternRecognizer.ts
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

export interface PatternContext {
  i: number;
  pName: string;
  branchName: string;
  cStars: string[];
  oStars: string[];
  sfStars: string[];
  prevStars: string[];
  nextStars: string[];
  isCurEmpty: boolean;
  isInner: boolean;
  sfBadCount: number;
  palaces: any[];
  hasMutagenSF: (type: string) => boolean;
  hasMutagenPalace: (idx: number, type: string) => boolean;
}

export interface PatternPlugin {
  id: string;
  name: string;
  check: (ctx: PatternContext) => {
    isMatch: boolean;
    score?: number;
    branch?: 'A'|'B'|'C';
    summary?: string;
    advice?: string;
    supp?: string;
    isAdv?: boolean;
    advText?: string;
  } | null;
}

// 🚀 终极三方四正全息雷达函数定义
const getStars = (palace: any) => {
  const stars: string[] = [];
  if (palace.majorStars) palace.majorStars.forEach((s: any) => stars.push(s.name));
  if (palace.minorStars) palace.minorStars.forEach((s: any) => stars.push(s.name));
  return stars;
};

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

// ==========================================
// 🧱 核心格局注册表 (无限扩展插件舱)
// ==========================================
const PATTERN_REGISTRY: PatternPlugin[] = [
  {
    id: '01', name: '【火贪/铃贪格】 突发波动格',
    check: (ctx) => {
      const { cStars, oStars, sfStars, sfBadCount, pName, i } = ctx;
      if (cStars.includes('贪狼') && (cStars.includes('火星') || cStars.includes('铃星') || oStars.includes('火星') || oStars.includes('铃星'))) {
        const isAdv = ['命宫', '财帛宫', '官禄宫', '迁移宫'].includes(pName);
        let advText = "";
        if (pName === '命宫') advText = "辰戌为四墓库，贪狼入墓库能收敛桃花气，专注财富积累；火/铃激发偏财，形成暴发格局！";
        else if (pName === '财帛宫') advText = "财富多呈阶梯式爆发跳跃。利于通过把握新兴风口获得丰厚收益。";
        else if (pName === '官禄宫') advText = "事业易有突发性高升，或接到极高提成的重头项目。";

        if (sfStars.includes('地空') || sfStars.includes('地劫') || ctx.hasMutagenPalace(i, '忌') || sfBadCount >= 3) {
          return { isMatch: true, score: -4, branch: 'A', summary: '破格 / 根基受损', advice: '该格局本具突发之机，但遇空劫或化忌冲破，主大起大落。建议稳健守成，严防高杠杆投资。', supp: '外部环境呈现突变特征，警惕突发性财务消耗。', isAdv, advText };
        } else if (ctx.hasMutagenSF('忌') || sfBadCount >= 1) {
          return { isMatch: true, score: 2, branch: 'B', summary: '受阻 / 获利伴波折', advice: '具备突破潜力，但伴随激烈竞争。机遇多在变动中产生，见好就收。', supp: '防范突发财务消耗。', isAdv, advText };
        } else {
          return { isMatch: true, score: 8, branch: 'C', summary: '成格 / 顺势突破', advice: '爆发力极强，能在特定周期内获得突破性进展。遇行业风口建议果断行动，随后转化为稳固资产。', supp: '易偶然结识爆发潜力合伙人。', isAdv, advText };
        }
      } return { isMatch: false };
    }
  },
  {
    id: '02', name: '【马头带剑格】 边疆开拓格',
    check: (ctx) => {
      const { cStars, branchName, sfStars, pName, i } = ctx;
      if (cStars.includes('天同') && cStars.includes('擎羊') && branchName === '午') {
        const isAdv = ['命宫', '迁移宫', '官禄宫'].includes(pName);
        let advText = pName === '命宫' ? "午宫属火，擎羊属金，火炼金成器！得此格为大将之格，适合武职、边疆、外交领域。" : (pName === '迁移宫' ? "极利外出发展，在陌生环境中能爆发出极强的生命力。" : "职场作风雷厉风行，适合公检法等硬核部门。");
        if (sfStars.includes('地空') || sfStars.includes('地劫') || ctx.hasMutagenSF('忌')) {
          return { isMatch: true, score: -4, branch: 'A', summary: '破格 / 盲目冲动', advice: '受空劫化忌破坏，决策易受情绪驱使。防意外工伤，宜选择按部就班的文职。', supp: '防范下属反叛或轻信他人导致外伤。', isAdv, advText };
        } else if (sfStars.includes('火星') || sfStars.includes('铃星') || sfStars.includes('陀罗')) {
          return { isMatch: true, score: 2, branch: 'B', summary: '受阻 / 激烈竞争', advice: '先苦后甜，事业必经坎坷。适合挑战性前沿开发，熬过低谷方能站稳。', supp: '环境带有极强的攻击性与竞争意识。', isAdv, advText };
        } else {
          return { isMatch: true, score: 8, branch: 'C', summary: '成格 / 极致执行', advice: '具备顶级开创执行力。极其适合异地发展或接手极具挑战性的新项目。', supp: '主外部助力强悍，能结交实权朋友。', isAdv, advText };
        }
      } return { isMatch: false };
    }
  },
  {
    id: '03', name: '【雄宿乾元格】 刚毅开创格',
    check: (ctx) => {
      const { cStars, oStars, branchName, sfStars, sfBadCount, pName, i } = ctx;
      if ((cStars.includes('廉贞') && cStars.includes('七杀') && branchName === '未') || (cStars.includes('廉贞') && branchName === '申' && oStars.includes('七杀')) || (cStars.includes('七杀') && branchName === '午')) {
        const isAdv = ['命宫', '官禄宫'].includes(pName);
        let advText = pName === '命宫' ? "自身气场不怒自威，一生追求极致效率与成就感，极具个人魅力。" : "职场作风硬朗，适合跨国重工业、大型基础建设或公检法高层。";
        if (sfBadCount >= 4 || (sfStars.includes('地空') && sfStars.includes('地劫'))) {
          return { isMatch: true, score: -3, branch: 'A', summary: '破格 / 过刚易折', advice: '性格易刚愎自用，绝不可游走合规红线。防范因刚烈导致的诉讼或意外。', supp: '极易与合伙人发生严重利益冲突。', isAdv, advText };
        } else if (ctx.hasMutagenSF('忌') || sfBadCount > 0) {
          return { isMatch: true, score: 3, branch: 'B', summary: '受阻 / 苦战夺魁', advice: '成就多在高度施压与竞争中获得。适合担任攻坚部门负责人，抗压能力强。', supp: '需以柔克刚应对外部危机。', isAdv, advText };
        } else {
          return { isMatch: true, score: 9, branch: 'C', summary: '成格 / 战略统御', advice: '兼具战略眼光与雷霆执行力。宜向大型企业一把手迈进，放权执行掌控大局。', supp: '能得强硬机构实质性提携。', isAdv, advText };
        }
      } return { isMatch: false };
    }
  },
  {
    id: '04', name: '【石中隐玉格】 韫椟藏珠格',
    check: (ctx) => {
      const { cStars, branchName, sfBadCount, pName, i } = ctx;
      if (cStars.includes('巨门') && (branchName === '子' || branchName === '午') && (ctx.hasMutagenPalace(i, '禄') || ctx.hasMutagenPalace(i, '权') || ctx.hasMutagenPalace(i, '科'))) {
        const isAdv = ['命宫', '财帛宫', '官禄宫'].includes(pName);
        let advText = pName === '命宫' ? "大智若愚，城府极深。擅长隐忍与谋划，典型的谋士或低调巨富。" : (pName === '财帛宫' ? "财富多源于专业技能或不公开独特渠道，极适合闷声发大财。" : "主得清要之职，适合文职管理岗位。");
        if (cStars.includes('擎羊') || ctx.hasMutagenPalace(i, '忌')) {
          return { isMatch: true, score: -6, branch: 'A', summary: '破格 / 言多必失', advice: '极易因沟通不当引发严重诉讼与名誉危机。谨言慎行，绝不参与是非议论。', supp: '防范背后捅刀的隐性小人。', isAdv, advText };
        } else if (sfBadCount > 0) {
          return { isMatch: true, score: 2, branch: 'B', summary: '受阻 / 怀才不遇', advice: '外界往往难以察觉您的真实实力，建议深耕某一冷门专业领域，靠硬实力说话。', supp: '潜藏危机，人际易生误解。', isAdv, advText };
        } else {
          return { isMatch: true, score: 8, branch: 'C', summary: '成格 / 厚积薄发', advice: '高筑墙广积粮是核心战略。早中期待资源成熟后，必能一鸣惊人收获财富地位。', supp: '能得暗中贵人提携。', isAdv, advText };
        }
      } return { isMatch: false };
    }
  },
  {
    id: '05', name: '【贪武同行格】 大器晚成格',
    check: (ctx) => {
      const { cStars, oStars, branchName, sfStars, pName, i } = ctx;
      if ((cStars.includes('武曲') && cStars.includes('贪狼') && (branchName === '丑' || branchName === '未')) || (cStars.includes('武曲') && oStars.includes('贪狼') && (branchName === '辰' || branchName === '戌'))) {
        const isAdv = ['命宫', '财帛宫', '官禄宫'].includes(pName);
        let advText = pName === '财帛宫' ? "财富积累先抑后扬。早年储蓄困难，中晚年极易执掌大额现金流或企业财权。" : "事业起步较晚，适合从事财税金融或高强度商贸工作。";
        if (sfStars.includes('地空') || sfStars.includes('地劫') || ctx.hasMutagenPalace(i, '忌')) {
          return { isMatch: true, score: -4, branch: 'A', summary: '破格 / 财务破败', advice: '不宜独立创业或过度扩张！极易遭遇资金链断裂。建议在体制内凭薪资安身立命。', supp: '早年极易受朋友拖累财务。', isAdv, advText };
        } else if (sfStars.includes('擎羊') || sfStars.includes('陀罗')) {
          return { isMatch: true, score: 2, branch: 'B', summary: '受阻 / 极度劳碌', advice: '早中年必经历极高工作强度，坚定深耕单一行业，中年后必能实现稳步攀升。', supp: '人际交往应以务实利益为导向。', isAdv, advText };
        } else if (ctx.hasMutagenPalace(i, '禄') && (sfStars.includes('火星') || sfStars.includes('铃星'))) {
          return { isMatch: true, score: 8, branch: 'C', summary: '成格 / 将星暴发', advice: '坚韧抗压，极易在金融运作或实体制造中捕捉时代红利，实现阶层跨越。', supp: '中晚年结识手握重资合伙人。', isAdv, advText };
        }
      } return { isMatch: false };
    }
  },
  {
    id: '06', name: '【七杀朝斗格】 独立统御格',
    check: (ctx) => {
      const { cStars, branchName, sfStars, sfBadCount, pName, i } = ctx;
      if (cStars.includes('七杀') && (branchName === '寅' || branchName === '申')) {
        const isAdv = ['命宫', '迁移宫', '官禄宫'].includes(pName);
        let advText = "寅申宫入庙独坐时格局纯正，对宫紫微/天府引导开创力，极利外出涉外发展，职场不畏艰难。";
        if (!ctx.hasMutagenSF('禄') && (sfStars.includes('地空') || sfStars.includes('地劫') || sfBadCount >= 3)) {
          return { isMatch: true, score: -3, branch: 'A', summary: '破格 / 孤立无援', advice: '一生切忌冲动创业或独自承担重大风险！最佳出路是依托成熟平台规避决策风险。', supp: '人际关系易趋于孤立。', isAdv, advText };
        } else if (sfBadCount > 0 || !ctx.hasMutagenSF('禄')) {
          return { isMatch: true, score: 2, branch: 'B', summary: '受阻 / 独木难支', advice: '执行力极强，但凡事需事必躬亲。极其适合安保、工程等硬性抗压岗位。', supp: '外部环境充满高强度竞争。', isAdv, advText };
        } else {
          return { isMatch: true, score: 8, branch: 'C', summary: '成格 / 掌权立威', advice: '具备跨国高管潜质。宜在大型组织中独立负责核心板块，放权管理必掌实权。', supp: '合伙人具有极强执行力与资本。', isAdv, advText };
        }
      } return { isMatch: false };
    }
  },
  {
    id: '07', name: '【机月同梁格】 幕僚高管格',
    check: (ctx) => {
      const { sfStars, sfBadCount, pName, i } = ctx;
      if (sfStars.includes('天机') && sfStars.includes('太阴') && sfStars.includes('天同') && sfStars.includes('天梁')) {
        // 🚀 全面补齐了白名单，命宫绝对得位！
        const isAdv = ['命宫', '官禄宫', '财帛宫', '迁移宫'].includes(pName);
        let advText = "极度得位！职场极其稳定，多服务于体制内、国企或制度完善的大型平台，擅长行政与企划。";
        if (ctx.hasMutagenSF('忌') || sfBadCount >= 3) {
          return { isMatch: true, score: -2, branch: 'A', summary: '破格 / 心机枉然', advice: '切忌参与复杂职场站队，防内耗。建议放下短期利益，专精硬核技术傍身。', supp: '需防范合伙人暗中算计。', isAdv, advText };
        } else if (sfBadCount >= 1) {
          return { isMatch: true, score: 2, branch: 'B', summary: '受阻 / 基层操劳', advice: '属典型的技术官僚，收益建立在极高操心上。适合体制内担任中层骨干。', supp: '环境具有精打细算特征。', isAdv, advText };
        } else {
          return { isMatch: true, score: 6, branch: 'C', summary: '成格 / 幕僚高管', advice: '顶级的智库配置！非常适合担任企业高管或政务官，核心价值在于运筹帷幄。', supp: '能结识极具智慧的良师益友。', isAdv, advText };
        }
      } return { isMatch: false };
    }
  },
  {
    id: '08', name: '【巨日同宫格】 跨界传名格',
    check: (ctx) => {
      const { cStars, branchName, sfStars, sfBadCount, pName, i } = ctx;
      if (cStars.includes('太阳') && cStars.includes('巨门') && (branchName === '寅' || branchName === '申')) {
        const isAdv = ['命宫', '迁移宫', '官禄宫', '财帛宫'].includes(pName);
        let advText = "极利向外拓展，在外易得异族/异地贵人相助，名声远播。宜从事涉外、法律、教育公关。";
        if ((branchName === '申' && ctx.hasMutagenSF('忌')) || sfStars.includes('地空') || sfStars.includes('擎羊')) {
          return { isMatch: true, score: -4, branch: 'A', summary: '破格 / 是非诉讼', advice: '极易因言语不当引发严重纠纷。绝不可发表偏激言论，沉默是金。', supp: '人际多口舌是非，保持社交距离。', isAdv, advText };
        } else if (sfBadCount > 0 && !ctx.hasMutagenSF('忌')) {
          return { isMatch: true, score: 2, branch: 'B', summary: '受阻 / 奔波求生', advice: '成就建立在频繁沟通与外勤上。建议深造外语或演讲能力，动口生财。', supp: '推进伴随高强度奔波与竞争。', isAdv, advText };
        } else {
          return { isMatch: true, score: branchName==='寅'?8:4, branch: 'C', summary: '成格 / 跨界传名', advice: '说服力极强，能建立广泛知名度。妥善经营个人品牌将带来丰厚名利。', supp: '外围环境多具跨文化特质。', isAdv, advText };
        }
      } return { isMatch: false };
    }
  },
  {
    id: '09', name: '【阳梁昌禄格】 权威科甲格',
    check: (ctx) => {
      const { sfStars, sfBadCount, pName, i } = ctx;
      if (sfStars.includes('太阳') && sfStars.includes('天梁') && sfStars.includes('文昌') && ctx.hasMutagenSF('禄')) {
        const isAdv = ['命宫', '官禄宫', '财帛宫'].includes(pName);
        let advText = "职场升迁考试极速通关，气质儒雅，非常适合公职、科研机构或垄断型国企。";
        if (ctx.hasMutagenSF('忌') && (sfStars.includes('地空') || sfStars.includes('地劫'))) {
          return { isMatch: true, score: -2, branch: 'A', summary: '破格 / 纸上谈兵', advice: '知识难以转化实际收益，切勿死读书。建议学习一门能即刻变现的实用技能。', supp: '朋友多为理论派缺乏实际互助。', isAdv, advText };
        } else if (sfBadCount > 0) {
          return { isMatch: true, score: 3, branch: 'B', summary: '受阻 / 考证迟滞', advice: '学术晋升有波折。坚持深耕需要硬核资格证的领域，资质终将成为基石。', supp: '学术或考证之路迟滞。', isAdv, advText };
        } else {
          return { isMatch: true, score: 9, branch: 'C', summary: '成格 / 权威科甲', advice: '国家级栋梁配置。极适合学术界、部委或研发领域。坚定考取更高学历或专利。', supp: '能结交深厚专业背景的良师益友。', isAdv, advText };
        }
      } return { isMatch: false };
    }
  },
  {
    id: '10', name: '【明珠出海格】 资源整合格',
    check: (ctx) => {
      const { branchName, isCurEmpty, oStars, cStars, sfBadCount, pName, i, palaces } = ctx;
      if (branchName === '未' && isCurEmpty && oStars.includes('天同') && oStars.includes('巨门') && (getStars(palaces[(i+4)%12]).includes('太阳') || getStars(palaces[(i+8)%12]).includes('太阳'))) {
        const isAdv = ['迁移宫', '命宫'].includes(pName);
        let advText = "涉外发展尤为吉利，主在外能得极佳口碑，左右逢源。善于借用大平台的红利。";
        if (cStars.includes('地空') || cStars.includes('地劫') || ctx.hasMutagenPalace((i+6)%12, '忌')) {
          return { isMatch: true, score: -3, branch: 'A', summary: '破格 / 明珠蒙尘', advice: '建议降低对名利执念，将才华释放在幕后研发中，避免高强度商业争夺。', supp: '资源虚浮无力，易遭隐蔽背叛。', isAdv, advText };
        } else if (sfBadCount > 0) {
          return { isMatch: true, score: 3, branch: 'B', summary: '受阻 / 晚发才华', advice: '大器晚成。早中期需默默无闻积累经验，适合从事自媒体设计等高IP行业。', supp: '早中期资源受阻，坚持可逆袭。', isAdv, advText };
        } else {
          return { isMatch: true, score: 8, branch: 'C', summary: '成格 / 资源整合', advice: '海纳百川！擅长整合外部资源为己所用。宜从事跨界统筹、大型项目平台运营。', supp: '得隐形富豪或优质长辈暗中栽培。', isAdv, advText };
        }
      } return { isMatch: false };
    }
  },
  {
    id: '11', name: '【日月并明/夹命格】 左右逢源格',
    check: (ctx) => {
      const { sfStars, branchName, prevStars, nextStars, isCurEmpty, cStars, sfBadCount, pName } = ctx;
      if ((sfStars.includes('太阳') && sfStars.includes('太阴') && branchName === '未') || (prevStars.includes('太阳') && nextStars.includes('太阴')) || (prevStars.includes('太阴') && nextStars.includes('太阳'))) {
        const isAdv = ['命宫', '夫妻宫', '财帛宫', '官禄宫'].includes(pName);
        let advText = "极易因婚姻或长辈助力跨越阶层，得天独厚，长辈缘与上司缘极佳。";
        if (isCurEmpty && (cStars.includes('地空') || sfStars.includes('地空'))) {
          return { isMatch: true, score: -3, branch: 'A', summary: '破格 / 虚名虚利', advice: '切忌打肿脸充胖子，绝不可涉足缺乏实体支撑的金融传销项目。脚踏实地。', supp: '交友圈中多趋炎附势之徒，缺乏真诚互助。', isAdv, advText };
        } else if (sfBadCount > 0) {
          return { isMatch: true, score: 2, branch: 'B', summary: '受阻 / 披星戴月', advice: '劳碌求财。适合从事早出晚归、跨越时区的行业。过程虽苦终能夯实家业。', supp: '劳心劳力，付出方有回报。', isAdv, advText };
        } else {
          return { isMatch: true, score: 7, branch: 'C', summary: '成格 / 左右逢源', advice: '犹如拥有金钟罩，极易获得高层破格提拔。大胆进入高规格社交圈展现自身。', supp: '父母双全或名下拥有优良不动产。', isAdv, advText };
        }
      } return { isMatch: false };
    }
  },
  {
    id: '12', name: '【君臣庆会格】 绝对领袖格',
    check: (ctx) => {
      const { cStars, sfStars, sfBadCount, pName, i } = ctx;
      const junChenCount = (sfStars.includes('左辅')?1:0) + (sfStars.includes('右弼')?1:0) + (sfStars.includes('天魁')?1:0) + (sfStars.includes('天钺')?1:0) + (sfStars.includes('天府')?1:0) + (sfStars.includes('天相')?1:0);
      if (cStars.includes('紫微') && junChenCount >= 4) {
        const isAdv = ['命宫', '官禄宫', '财帛宫'].includes(pName);
        let advText = "天生领导者，极具包容力与威严感，职场统御力极强，能驾驭庞大企业架构。";
        if (junChenCount < 2 && sfBadCount > 0) {
          return { isMatch: true, score: -2, branch: 'A', summary: '破格 / 孤君暴君', advice: '切忌实行一言堂或盲目独自创业！学会在组织中低头，以专业技术立足。', supp: '下属野心难以驾驭，需建立防波堤。', isAdv, advText };
        } else if (ctx.hasMutagenSF('忌') || sfBadCount >= 2) {
          return { isMatch: true, score: 4, branch: 'B', summary: '受阻 / 劳心掌柜', advice: '管理地位是在高压中打拼出来的。适合担任救火队长、重组并购负责人。', supp: '环境高压，管理极其操心。', isAdv, advText };
        } else {
          return { isMatch: true, score: 10, branch: 'C', summary: '成格 / 绝对领袖', advice: '具备极强领袖气场，适合向政商两界或大型组织最高决策层迈进。放权管理。', supp: '能结交顶级人脉，下属得力忠诚。', isAdv, advText };
        }
      } return { isMatch: false };
    }
  }
];

export function recognizePatterns(iztroData: any): PatternResult[] {
  if (!iztroData || !iztroData.palaces) return [];
  const palaces = iztroData.palaces;
  const results: PatternResult[] = [];
  const INNER_PALACES = ['命宫', '财帛宫', '官禄宫', '迁移宫', '夫妻宫', '子女宫'];

  for (let i = 0; i < 12; i++) {
    const curP = palaces[i];
    const pNameRaw = curP.name || '';
    const pName = pNameRaw.endsWith('宫') ? pNameRaw : pNameRaw + '宫';
    
    const ctx: PatternContext = {
      i, pName, branchName: curP.earthlyBranch,
      cStars: getStars(curP),
      oStars: getStars(palaces[(i + 6) % 12]),
      sfStars: [...getStars(curP), ...getStars(palaces[(i + 6) % 12]), ...getStars(palaces[(i + 4) % 12]), ...getStars(palaces[(i + 8) % 12])],
      prevStars: getStars(palaces[(i + 11) % 12]),
      nextStars: getStars(palaces[(i + 1) % 12]),
      isCurEmpty: (!curP.majorStars || curP.majorStars.length === 0),
      isInner: INNER_PALACES.includes(pName),
      sfBadCount: [...getStars(curP), ...getStars(palaces[(i + 6) % 12]), ...getStars(palaces[(i + 4) % 12]), ...getStars(palaces[(i + 8) % 12])].filter(s => ['擎羊', '陀罗', '火星', '铃星', '地空', '地劫'].includes(s)).length,
      palaces,
      hasMutagenSF: (type: string) => checkMutagenSF(palaces, i, type),
      hasMutagenPalace: (idx: number, type: string) => hasMutagenPalace(palaces, idx, type)
    };

    const calculatePurity = () => {
      let p = 1.0;
      if (ctx.sfStars.includes('左辅') && ctx.sfStars.includes('右弼')) p += 0.1;
      if (ctx.sfStars.includes('天魁') && ctx.sfStars.includes('天钺')) p += 0.1;
      p -= (ctx.sfBadCount * 0.15);
      return Math.max(0.1, Math.min(1.5, p)); 
    };

    PATTERN_REGISTRY.forEach(plugin => {
      const res = plugin.check(ctx);
      if (res && res.isMatch) {
        let finalScore = (res.score || 0) * calculatePurity();
        if (!res.isAdv) finalScore *= 0.5; // 闲宫腰斩
        if (ctx.isCurEmpty && finalScore > 0) finalScore *= 0.7;
        finalScore = Math.max(-12, Math.min(12, finalScore));

        results.push({
          palaceIndex: i, palaceName: pName, patternName: plugin.name,
          type: finalScore > 0 ? '吉' : '凶', finalScore: Number(finalScore.toFixed(1)),
          branch: res.branch || 'A', summary: res.summary || '', advice: res.advice || '',
          isInnerPalace: ctx.isInner, supplementaryAdvice: res.supp,
          isAdvantage: res.isAdv || false, showInDashboard: res.isAdv || false, advantageText: res.advText
        });
      }
    });
  }

  return results.sort((a, b) => Math.abs(b.finalScore) - Math.abs(a.finalScore));
}
