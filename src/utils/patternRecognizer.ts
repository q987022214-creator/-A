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
  hasMutagenJia: (type: string) => boolean;
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

// 🚀 强效正则清洗器：把 贪狼(利)[化忌] 这种全部洗成 贪狼，绝不漏抓！
const getStars = (palace: any) => {
  const stars: string[] = [];
  const extract = (arr: any[]) => {
    if (!arr) return;
    arr.forEach(s => {
      if (typeof s === 'string') {
        stars.push(s.replace(/[\[\(].*?[\]\)]/g, '').trim());
      } else if (s && s.name) {
        stars.push(s.name.replace(/[\[\(].*?[\]\)]/g, '').trim());
      }
    });
  };
  extract(palace.majorStars);
  extract(palace.minorStars);
  extract(palace.adjectiveStars);
  extract(palace.stars);
  return Array.from(new Set(stars));
};

const checkMutagenSF = (palaces: any[], currentIndex: number, type: string) => {
  const sfIndices = [currentIndex, (currentIndex + 4) % 12, (currentIndex + 8) % 12, (currentIndex + 6) % 12];
  for (const idx of sfIndices) {
    const p = palaces[idx];
    if (!p) continue;
    if (p.stars) {
      if (type === '禄' && p.stars.some((s:string) => s.includes('禄存') || s.includes('[化禄]') || s.includes('化禄'))) return true;
      if (type !== '禄' && p.stars.some((s:string) => s.includes(`[化${type}]`) || s.includes(`化${type}`))) return true;
    }
    const rawStars = [...(p.majorStars||[]), ...(p.minorStars||[])];
    if (type === '禄' && rawStars.some((s:any) => s.mutagen === '禄' || s.name === '禄存')) return true;
    if (type !== '禄' && rawStars.some((s:any) => s.mutagen === type)) return true;
  }
  return false;
};

const hasMutagenPalace = (palaces: any[], currentIndex: number, type: string) => {
  const p = palaces[currentIndex];
  if (!p) return false;
  if (p.stars) {
    if (type === '禄' && p.stars.some((s:string) => s.includes('禄存') || s.includes('[化禄]') || s.includes('化禄'))) return true;
    if (type !== '禄' && p.stars.some((s:string) => s.includes(`[化${type}]`) || s.includes(`化${type}`))) return true;
  }
  const rawStars = [...(p.majorStars||[]), ...(p.minorStars||[])];
  if (type === '禄' && rawStars.some((s:any) => s.mutagen === '禄' || s.name === '禄存')) return true;
  if (type !== '禄' && rawStars.some((s:any) => s.mutagen === type)) return true;
  return false;
};

const checkMutagenJia = (palaces: any[], currentIndex: number, type: string) => {
  return hasMutagenPalace(palaces, (currentIndex + 11) % 12, type) || hasMutagenPalace(palaces, (currentIndex + 1) % 12, type);
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
        const isAdv = ['财帛宫', '官禄宫'].includes(pName);
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
        // 🚀 确保命宫绝对得位
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
          return { isMatch: true, score: -3, branch: 'A', summary: '破格 / 虚名虚利', advice: '切忌打肿脸充胖子，绝不可涉足缺乏实体支撑的金融传销项目。脚踏实地。', supp: '交友圈多趋炎附势之徒，缺乏真诚互助。', isAdv, advText };
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
  },
  {
    id: '13', name: '【府相朝垣格】 稳固财库格',
    check: (ctx) => {
      const { cStars, sfStars, sfBadCount, pName, i } = ctx;
      if (!cStars.includes('紫微') && sfStars.includes('天府') && sfStars.includes('天相')) {
        const isAdv = ['财帛宫', '官禄宫'].includes(pName);
        let advText = pName === '财帛宫' ? "财务状况极其稳健，一生不愁现金流，利于长线价值投资。" : "职场环境优越，宜在制度健全的大型机构担任财务高管。";
        if (!ctx.hasMutagenSF('禄') && (sfStars.includes('地空') || sfStars.includes('地劫'))) {
          return { isMatch: true, score: -3, branch: 'A', summary: '破格 / 财库见空', advice: '天府天相本主衣食无忧，但受空劫洗劫，容易陷入透支或高负债陷阱。严禁盲目担保或高杠杆炒房。', supp: '外部机构看似庞大实则虚空，合作务必尽调。', isAdv, advText };
        } else if (sfBadCount > 0) {
          return { isMatch: true, score: 3, branch: 'B', summary: '受阻 / 过路财神', advice: '资金流转频繁，难以大量沉淀。极适合在企业中协助一把手管账（二把手哲学），独立操盘易遇流动性枯竭。', supp: '资金流转极快，防范流动性枯竭。', isAdv, advText };
        } else {
          return { isMatch: true, score: 8, branch: 'C', summary: '成格 / 稳固财库', advice: '财库充盈，具备极高的抗风险与资金运作能力。建议配置优质不动产或家族信托基金，财富可跨代积累。', supp: '极易获得实力雄厚长辈的实质性资金背书。', isAdv, advText };
        }
      } return { isMatch: false };
    }
  },
  {
    id: '14', name: '【双禄朝垣格】 源源不绝格',
    check: (ctx) => {
      const { sfStars, pName, i } = ctx;
      const luCount = (sfStars.includes('禄存')?1:0) + (ctx.hasMutagenSF('禄')?1:0);
      if (luCount >= 2) {
        const isAdv = ['财帛宫', '迁移宫'].includes(pName);
        let advText = pName === '财帛宫' ? "终生不缺赚钱门路，对数字与商机极度敏感。" : "动中生财，极其适合跨地发展或从事进出口贸易。";
        if (sfStars.includes('地空') || sfStars.includes('地劫')) {
          return { isMatch: true, score: -4, branch: 'A', summary: '破格 / 禄随空亡', advice: '本具优渥获利渠道，但双禄被吞噬，主财富大起大落。一旦获得大额收益，请立即转化为不动产。', supp: '防范身边人对您的财产虎视眈眈。', isAdv, advText };
        } else if (sfStars.includes('擎羊') || sfStars.includes('陀罗') || ctx.hasMutagenPalace(i, '忌')) {
          return { isMatch: true, score: 3, branch: 'B', summary: '受阻 / 因财招妒', advice: '财源滚滚但伴随竞争争议，极易引发同行眼红。切忌一毛不拔，利益均沾方能化解隐患。', supp: '利益均沾方能化解招妒。', isAdv, advText };
        } else {
          return { isMatch: true, score: 9, branch: 'C', summary: '成格 / 源源不绝', advice: '吸金能力极强，多渠道进财。建议大胆涉足高现金流生意，财富雪球将越滚越大。', supp: '合伙人或配偶自带丰厚资本提供资金注入。', isAdv, advText };
        }
      } return { isMatch: false };
    }
  },
  {
    id: '15', name: '【三奇加会格】 顺风顺水格',
    check: (ctx) => {
      const { sfBadCount, pName, i } = ctx;
      if (ctx.hasMutagenSF('禄') && ctx.hasMutagenSF('权') && ctx.hasMutagenSF('科')) {
        const isAdv = ['命宫', '官禄宫', '财帛宫'].includes(pName);
        let advText = "三奇主财富、权力、名声！分别入位则能量均衡不偏废，极易成为行业标杆或领军人物，政商两界皆可通达。";
        if (ctx.hasMutagenSF('忌') && sfBadCount >= 3) {
          return { isMatch: true, score: -2, branch: 'A', summary: '破格 / 华而不实', advice: '本具极佳才华，但受忌煞引爆，易在顶峰因执念跌落。必须修炼合规意识，见好就收。', supp: '外部贵人雷声大雨点小，防范高层派系斗争波及自身。', isAdv, advText };
        } else if (sfBadCount > 0 || ctx.hasMutagenSF('忌')) {
          return { isMatch: true, score: 4, branch: 'B', summary: '受阻 / 名利伴争', advice: '名权利皆有所获，但晋升求财伴随非议竞争。保持抗压能力，在复杂斗争中稳中求胜。', supp: '竞争环境险恶，需极强心理素质。', isAdv, advText };
        } else {
          return { isMatch: true, score: 10, branch: 'C', summary: '成格 / 顺风顺水', advice: '天道酬勤且资源丰厚，名声、地位与财富三者兼得！在合法前提下大胆攀登巅峰。', supp: '能在关键时刻得到手握重权贵人的全力托举。', isAdv, advText };
        }
      } return { isMatch: false };
    }
  },
  {
    id: '16', name: '【三奇朝斗格】 宏观统御格',
    check: (ctx) => {
      const { cStars, sfStars, sfBadCount, pName, i } = ctx;
      if (cStars.includes('紫微') && ctx.hasMutagenSF('禄') && ctx.hasMutagenSF('权') && ctx.hasMutagenSF('科')) {
        const isAdv = ['命宫'].includes(pName);
        let advText = "自身气局宏大，天生自带令人信服的威严，一生易得重用。";
        if (ctx.hasMutagenSF('忌') && (sfStars.includes('地空') || sfStars.includes('地劫'))) {
          return { isMatch: true, score: -3, branch: 'A', summary: '破格 / 德不配位', advice: '心志高但环境险恶，期望与现实脱节。放下身段从基层做起，避免盲目扩张遭遇滑铁卢。', supp: '高层贵人难触达，易被权力更迭波及，谨慎站队。', isAdv, advText };
        } else if (sfBadCount > 0) {
          return { isMatch: true, score: 5, branch: 'B', summary: '受阻 / 奋斗霸主', advice: '具备强大统御力，但事业版图是激烈斗争打拼而来。保持钢铁意志，妥善处理利益分配。', supp: '大局在握，但多生斗争。', isAdv, advText };
        } else {
          return { isMatch: true, score: 12, branch: 'C', summary: '成格 / 顶级显贵', advice: '紫微斗数绝对塔尖的帝王级配置！注定承担更大社会责任，请毫无顾忌攀登政界商界最高峰。', supp: '能结识行业泰斗或顶级资本家，获益无穷。', isAdv, advText };
        }
      } return { isMatch: false };
    }
  },
  {
    id: '25', name: '【财荫夹印格】 资源庇护格',
    check: (ctx) => {
      const { cStars, prevStars, nextStars, sfBadCount, pName, i } = ctx;
      if (cStars.includes('天相')) {
        const prevL = ctx.hasMutagenPalace((i+11)%12, '禄');
        const nextL = ctx.hasMutagenPalace((i+1)%12, '禄');
        const isCaiYin = (prevL && nextStars.includes('天梁')) || (nextL && prevStars.includes('天梁'));
        if (isCaiYin) {
          const isAdv = ['命宫', '财帛宫'].includes(pName);
          let advText = pName === '命宫' ? "自带福荫，为人稳重守信，易得他人资助，平顺少波折。" : "钱财来源稳定，常有意外之财或来自长辈赠予。";
          if (cStars.includes('地空') || cStars.includes('地劫') || ctx.hasMutagenPalace(i, '忌') || sfBadCount >= 3) {
            return { isMatch: true, score: -3, branch: 'A', summary: '破格 / 夹印受损', advice: '受空忌冲击，庇护反成枷锁。保持财务独立，切勿将核心资产交他人打理，防范连带损失。', supp: '外部资源看似优渥实则附带苛刻条件，需警惕财务纠纷。', isAdv, advText };
          } else if (sfBadCount > 0) {
            return { isMatch: true, score: 3, branch: 'B', summary: '受阻 / 庇护有瑕', advice: '能得贵人扶持但时断时续。宜在体制内或成熟平台借力但不依附，用专业能力换取资源。', supp: '贵人扶持伴随利益交换。', isAdv, advText };
          } else {
            return { isMatch: true, score: 8, branch: 'C', summary: '成格 / 双重庇护', advice: '得天时地利人和！一生易得长辈疼惜上级提携，适合在稳定大机构深耕，稳健攀升。', supp: '父母宫或田宅宫力量强劲，能提供资金房产支持。', isAdv, advText };
          }
        }
      } return { isMatch: false };
    }
  },
  {
    id: '26', name: '【禄文拱命格】 知识变现格',
    check: (ctx) => {
      const { sfStars, sfBadCount, pName, i } = ctx;
      if (ctx.hasMutagenSF('禄') && (sfStars.includes('文昌') || sfStars.includes('文曲'))) {
        const isAdv = ['命宫', '官禄宫', '田宅宫', '财帛宫'].includes(pName);
        let advText = "依靠笔杆子、知名度或文化艺术周边获得持续性、高净值的正规收入。";
        if ((sfStars.includes('地空') || sfStars.includes('地劫')) && ctx.hasMutagenSF('忌')) {
          return { isMatch: true, score: -3, branch: 'A', summary: '破格 / 空头支票', advice: '极易陷入伪造文书、版权纠纷或利用专业知识违规操作。必须严守职业道德！', supp: '严防在合作协议、报表中出现文字漏洞导致连带赔偿。', isAdv, advText };
        } else if (sfBadCount > 0) {
          return { isMatch: true, score: 2, branch: 'B', summary: '受阻 / 知识劳作', advice: '典型知识型苦力。建议深化不可替代的专业壁垒，避免陷入低价值的重复性脑力劳动。', supp: '避免陷入低价值的重复性脑力劳动。', isAdv, advText };
        } else {
          return { isMatch: true, score: 8, branch: 'C', summary: '成格 / 儒商巨头', advice: '文人致富终极模板！极具个人IP潜质，适合自媒体、文化产业投资。输出创意即印钞机。', supp: '能通过合伙人极强的专业包装能力获得商业成功。', isAdv, advText };
        }
      } return { isMatch: false };
    }
  },
  {
    id: '27', name: '【科权禄夹格】 贵人提携格',
    check: (ctx) => {
      const { cStars, sfBadCount, pName, i } = ctx;
      if (!ctx.hasMutagenPalace(i, '禄') && ctx.hasMutagenJia('禄') && ctx.hasMutagenJia('权')) {
        const isAdv = ['命宫', '官禄宫', '财帛宫'].includes(pName);
        let advText = "赚钱轻松，多能获得政策补贴、家族信托或高端客户的直接输血。";
        if (ctx.hasMutagenPalace(i, '忌') || cStars.includes('擎羊') || cStars.includes('陀罗')) {
          return { isMatch: true, score: -3, branch: 'A', summary: '破格 / 夹击成灾', advice: '出身圈层要求苛刻，易陷入焦虑。建议尽早独立，寻找适合自己节奏的下沉市场或细分赛道。', supp: '外部资源看似诱人实则附带极高的隐性代价或道德绑架。', isAdv, advText };
        } else if (sfBadCount > 0) {
          return { isMatch: true, score: 3, branch: 'B', summary: '受阻 / 被动成功', advice: '具被动躺赢特质，事业多由他人推动。遇困难学会向身边的贵人求助，人生少走弯路。', supp: '遇事多向身边贵人借力。', isAdv, advText };
        } else {
          return { isMatch: true, score: 8, branch: 'C', summary: '成格 / 左右逢源', advice: '犹如身处优渥温室，顺风顺水。建议在体制内或成熟家族企业按部就班发展，借势攀升。', supp: '兄弟配偶或父母极具社会地位，直接输送财富人脉。', isAdv, advText };
        }
      } return { isMatch: false };
    }
  },
  {
    id: '28', name: '【禄马交驰格】 动中得财格',
    check: (ctx) => {
      const { cStars, sfStars, sfBadCount, pName, i } = ctx;
      if ((ctx.hasMutagenSF('禄') || sfStars.includes('禄存')) && sfStars.includes('天马')) {
        const isAdv = ['迁移宫', '财帛宫', '命宫', '官禄宫'].includes(pName);
        let advText = "";
        if (pName === '迁移宫') advText = "动中得财，外出发展机遇无限，易在异地建立人脉与事业根基。";
        else if (pName === '财帛宫') advText = "财富来源多元化，常有多条并行收入渠道，尤利跨区域贸易跨境业务。";
        else if (pName === '命宫') advText = "一生好动，越动越顺，思维活跃，富贵双全！";
        else if (pName === '官禄宫') advText = "晋升靠主动争取与异地机会，出差外务多，动而有成。";

        if (sfStars.includes('地空') || sfStars.includes('地劫') || ctx.hasMutagenSF('忌') || (cStars.includes('天马') && sfBadCount >= 3)) {
          return { isMatch: true, score: -4, branch: 'A', summary: '破格 / 奔波无获', advice: '奔波劳碌却徒劳无功。不宜从事频繁出差行业，防异地合同纠纷。建议固守本地发展。', supp: '防范因异地事务引发的家庭财务纠纷。', isAdv, advText };
        } else if (sfBadCount > 0) {
          return { isMatch: true, score: 2, branch: 'B', summary: '受阻 / 劳碌求财', advice: '财源多来自异地流动，过程辛劳。适合外贸物流等动口动脚行业，注重成本控制。', supp: '环境呈现高频流动特征。', isAdv, advText };
        } else {
          return { isMatch: true, score: 9, branch: 'C', summary: '成格 / 财通四海', advice: '具备极强跨区域资源整合力！宜大胆布局海外市场或线上跨域业务，财富随足迹增长。', supp: '能通过异地朋友获商业机会或房产增值。', isAdv, advText };
        }
      } return { isMatch: false };
    }
  },
  {
    id: '29', name: '【紫府朝垣格】 极品尊贵格',
    check: (ctx) => {
      const { cStars, sfStars, sfBadCount, pName, i } = ctx;
      if (!cStars.includes('紫微') && !cStars.includes('天府') && sfStars.includes('紫微') && sfStars.includes('天府')) {
        const isAdv = ['命宫', '官禄宫', '财帛宫', '迁移宫'].includes(pName);
        let advText = "大格局正中最优位！气度恢弘，极具大将之风，一生财富地位均能达到极高层级。";
        if (sfStars.includes('地空') || sfStars.includes('地劫') || ctx.hasMutagenSF('忌')) {
          return { isMatch: true, score: -3, branch: 'A', summary: '破格 / 虚有其表', advice: '主外表光鲜内里虚弱，极易打肿脸充胖子负债。切忌强行扩张，放下身段脚踏实地。', supp: '人脉圈虽高大上，但多是泛泛之交难以提供帮助。', isAdv, advText };
        } else if (sfBadCount > 0) {
          return { isMatch: true, score: 2, branch: 'B', summary: '受阻 / 奋斗成名', advice: '抗压能力极佳，非常适合在充满竞争的大企业中凭借自身实力逐步攀升。煞星是垫脚石。', supp: '需在复杂的竞争环境中建立自己的威望。', isAdv, advText };
        } else {
          return { isMatch: true, score: 8, branch: 'C', summary: '成格 / 紫府朝垣', advice: '气局宏大！天生具备管理与统御之才，宜向大机构高管进发。宽厚稳重，一生富贵双全。', supp: '能结交极具地位与财富的顶级贵人圈层。', isAdv, advText };
        }
      } return { isMatch: false };
    }
  },
  {
    id: '30', name: '【日月反背格】 逆境反转格',
    check: (ctx) => {
      const { sfStars, branchName, sfBadCount, pName, i } = ctx;
      if (sfStars.includes('太阳') && sfStars.includes('太阴') && ['戌','亥','子'].includes(branchName)) {
        const isAdv = ['命宫', '福德宫', '夫妻宫'].includes(pName); 
        let advText = "此格正中最忌位！一生劳碌、日夜颠倒、身心俱疲，极易抑郁、怀才不遇或婚姻破裂！";
        if (ctx.hasMutagenSF('禄') || ctx.hasMutagenSF('权') || ctx.hasMutagenSF('科') || (sfStars.includes('左辅') && sfStars.includes('右弼'))) {
          return { isMatch: true, score: 8, branch: 'A', summary: '终极翻盘 / 跨国首富', advice: '触发极罕见极地大反转！早年艰辛，但极大概率在异地或冷门行业白手起家获巨额财富！', supp: '在外乡结识具有颠覆性力量的异邦贵人。', isAdv, advText };
        } else if (sfStars.includes('禄存')) {
          return { isMatch: true, score: 2, branch: 'B', summary: '轻度翻盘 / 勤劳致富', advice: '属于凭借极致勤奋跨越阶层。适合跨国时差业务、夜班或24小时服务业，苦换回报。', supp: '汗水换取跨越阶层。', isAdv, advText };
        } else if (ctx.hasMutagenSF('忌') && sfBadCount >= 2) {
          return { isMatch: true, score: -8, branch: 'C', summary: '绝对成格 / 劳而无功', advice: '干最累的活背最黑的锅！切忌盲目投资与离乡背井冒险！寻一份按时上下班工作保重身体。', supp: '父母长辈难以庇护，必须依靠自身双手独立谋生。', isAdv, advText };
        }
      } return { isMatch: false };
    }
  },
  {
    id: '31', name: '【刑忌夹印格】 腹背受敌格',
    check: (ctx) => {
      const { cStars, prevStars, nextStars, sfStars, pName, i } = ctx;
      if (cStars.includes('天相')) {
        const isJia = (ctx.hasMutagenPalace((i+11)%12, '忌') && (nextStars.includes('天梁') || nextStars.includes('擎羊'))) || 
                      (ctx.hasMutagenPalace((i+1)%12, '忌') && (prevStars.includes('天梁') || prevStars.includes('擎羊')));
        if (isJia) {
          const isAdv = ['命宫', '财帛宫', '夫妻宫', '官禄宫'].includes(pName);
          let advText = pName === '官禄宫' ? "职场极易遭遇背锅事件，宜从事纪检审计等带刑忌职业以毒攻毒！" : "伤害极大！主多是非官司、破财被骗或婚姻反目！";
          if (ctx.hasMutagenPalace(i, '禄') || ctx.hasMutagenPalace(i, '权') || ctx.hasMutagenPalace(i, '科')) {
            return { isMatch: true, score: 2, branch: 'A', summary: '完美化解 / 夹处逢生', advice: '外界高压但抗压强，化被动为主动！适合处理高难度纠纷或危机公关，力挽狂澜。', supp: '虽出身恶劣，但能达成和解或成功切割。', isAdv, advText };
          } else if (sfStars.includes('左辅') || sfStars.includes('右弼') || sfStars.includes('天魁')) {
            return { isMatch: true, score: -3, branch: 'B', summary: '轻度化解 / 苦撑待变', advice: '常有夹在中间受气憋屈感，易背黑锅。签署合同务必核对防连带责任，多求助长辈。', supp: '苦撑待变，防连带责任。', isAdv, advText };
          } else {
            return { isMatch: true, score: -7, branch: 'C', summary: '绝对成格 / 腹背受敌', advice: '印绶信用遭严重破坏！一生绝不可做财务担保或触碰合规红线！企业违规立即辞职防背锅。', supp: '家庭或合伙人强势且多官非拖累命主。', isAdv, advText };
          }
        }
      } return { isMatch: false };
    }
  },
  {
    id: '32', name: '【铃昌陀武格】 绝境水厄格',
    check: (ctx) => {
      const { sfStars, pName, i } = ctx;
      if (sfStars.includes('铃星') && sfStars.includes('文昌') && sfStars.includes('陀罗') && sfStars.includes('武曲')) {
        const isAdv = ['财帛宫', '命宫', '疾厄宫', '官禄宫'].includes(pName);
        let advText = "此格正中最忌位！财务彻底清算跳票，或主心智绝望、突遭解雇被淘汰，且伴随呼吸系统重症乃至意外伤灾风险！";
        if (ctx.hasMutagenSF('禄') || ctx.hasMutagenSF('科') || sfStars.includes('禄存') || sfStars.some(s => s.includes('天梁') && s.includes('科'))) {
          return { isMatch: true, score: 2, branch: 'A', summary: '完美化解 / 绝处逢生', advice: '曾经历极严重财务事业危机，但凭底盘化解！劫后涅槃重生，极适合金融风控重工业。', supp: '能提前预判外部风险，成功抽身。', isAdv, advText };
        } else if (sfStars.includes('紫微') || sfStars.includes('天府')) {
          return { isMatch: true, score: -3, branch: 'B', summary: '轻度化解 / 割肉止损', advice: '投资推进中发现陷入泥潭或亏损触及红线，必须立刻果断止损！严禁抱有赌徒心理。', supp: '果断止损是唯一出路。', isAdv, advText };
        } else {
          return { isMatch: true, score: -10, branch: 'C', summary: '绝对成格 / 绝境水厄', advice: '红色绝命预警！极易因合同诈骗跳票导致彻底清算！一生严禁涉足股市期货及高利贷。防范意外。', supp: '机构、配偶极易发生突然破产官非引发连带责任。', isAdv, advText };
        }
      } return { isMatch: false };
    }
  },
  {
    id: '33', name: '【羊陀夹忌格】 窒息深渊格',
    check: (ctx) => {
      const { cStars, prevStars, nextStars, sfStars, sfBadCount, pName, i } = ctx;
      if (ctx.hasMutagenPalace(i, '忌') && ((prevStars.includes('擎羊') && nextStars.includes('陀罗')) || (prevStars.includes('陀罗') && nextStars.includes('擎羊')))) {
        const isAdv = ['福德宫'].includes(pName);
        let advText = "精神世界极度压抑，易患重度抑郁或强迫症，极度需要宗教、哲学等精神寄托来化解宿命感。";
        if ((cStars.includes('紫微') || (cStars.includes('七杀')||cStars.includes('武曲')&&ctx.hasMutagenSF('禄'))) && sfBadCount === 0) {
          return { isMatch: true, score: -2, branch: 'A', summary: '完美化解 / 冲破牢笼', advice: '内心如孤城，但凭强悍意志能强行突围！破局唯一方法：主动放权舍弃，破财消灾打破枷锁。', supp: '经历长期阵痛后，能依靠法律距离艰难切割。', isAdv, advText };
        } else if (sfStars.includes('左辅') || sfStars.includes('天魁')) {
          return { isMatch: true, score: -5, branch: 'B', summary: '轻度化解 / 精神内耗', advice: '呈现严重作茧自缚状态。极度内耗，建议降低心理预期，接受不完美也是常态，寻找心理疏导。', supp: '内耗严重，需学会与自我和解。', isAdv, advText };
        } else {
          return { isMatch: true, score: -8, branch: 'C', summary: '绝对成格 / 窒息深渊', advice: '斗数中最憋屈窒息级凶格！越挣扎陷得越深，解药只有彻底躺平放手。绝不强求，转移精力。', supp: '家庭婚姻犹如泥沼，不断压榨财务精力极难脱身。', isAdv, advText };
        }
      } return { isMatch: false };
    }
  },
  {
    id: '34', name: '【空劫夹命/财格】 财务消耗格',
    check: (ctx) => {
      const { prevStars, nextStars, sfBadCount, pName, i } = ctx;
      if (['命宫', '财帛宫'].includes(pName) && ((prevStars.includes('地空') && nextStars.includes('地劫')) || (prevStars.includes('地劫') && nextStars.includes('地空')))) {
        const isAdv = ['命宫', '财帛宫', '田宅宫'].includes(pName);
        let advText = "一生财来财去、半空折翅，财库漏底投资必亏，房产纠纷祖业难守！";
        if (ctx.hasMutagenPalace(i, '禄') || ctx.hasMutagenPalace(i, '权')) {
          return { isMatch: true, score: 2, branch: 'A', summary: '化险为夷 / 虚拟生财', advice: '具备化空为用极高悟性。思维不落俗套，极度适合虚拟经济、软件开发或哲学心理等非传统行业。', supp: '能通过合伙人的奇思妙想获得意外灵感。', isAdv, advText };
        } else if (sfBadCount === 0) {
          return { isMatch: true, score: -3, branch: 'B', summary: '轻度化解 / 随遇而安', advice: '财富不知不觉消耗。建议养成极度保守理财习惯，财务交由信托机构或稳重配偶打理。', supp: '防范财富不知不觉流流失。', isAdv, advText };
        } else {
          return { isMatch: true, score: -6, branch: 'C', summary: '绝对成格 / 财务黑洞', advice: '一生极易遭遇半空折翅重大挫败！绝对禁止独立创业高杠杆投机。安分守己凭薪水度日。', supp: '合作中极易被他人掏空资源，亲友频繁借贷不还。', isAdv, advText };
        }
      } return { isMatch: false };
    }
  },
  {
    id: '35', name: '【巨火擎羊格】 烈火是非格',
    check: (ctx) => {
      const { sfStars, pName, i } = ctx;
      if (sfStars.includes('巨门') && sfStars.includes('火星') && sfStars.includes('擎羊')) {
        const isAdv = ['命宫', '官禄宫'].includes(pName);
        let advText = "事业推进中伴随极端的反对声音，甚至引发官司，需依靠强硬的法律手段或合规途径扫清障碍。";
        if ((ctx.hasMutagenSF('禄') || ctx.hasMutagenSF('权')) && !ctx.hasMutagenSF('忌')) {
          return { isMatch: true, score: 2, branch: 'A', summary: '化险为夷 / 权威舌战', advice: '能将煞气转化为强悍说服力。极适合法律诉讼外交谈判，能在激烈交锋中占据上风生财。', supp: '能有效震慑外部不良势力，建立威信。', isAdv, advText };
        } else if (sfStars.includes('左辅') || sfStars.includes('天魁')) {
          return { isMatch: true, score: -3, branch: 'B', summary: '轻度化解 / 口硬心软', advice: '行事火爆，无意中得罪他人。建议职场生活中修炼情绪管理，深呼吸后再作答，结交温和朋友。', supp: '修炼情绪管理，防无意得罪人。', isAdv, advText };
        } else {
          return { isMatch: true, score: -7, branch: 'C', summary: '绝对成格 / 官非争端', advice: '典型的祸从口出高危结构！极易因冲动网络发帖陷入严重官司！务必谨言慎行，绝不参与是非。', supp: '极易遭遇蛮不讲理客户对手或暴躁配偶引发冲突。', isAdv, advText };
        }
      } return { isMatch: false };
    }
  },
  {
    id: '36', name: '【极居卯酉格】 物欲交战格',
    check: (ctx) => {
      const { cStars, sfStars, branchName, pName, i } = ctx;
      if (cStars.includes('紫微') && cStars.includes('贪狼') && (branchName === '卯' || branchName === '酉')) {
        const isAdv = ['命宫', '福德宫', '财帛宫'].includes(pName);
        let advText = "物欲极强、沉迷声色易破财；精神空虚纵欲过度易患心病；或高杠杆投机负债累累！";
        if (ctx.hasMutagenPalace(i, '禄') && sfStars.includes('左辅') && sfStars.includes('右弼')) {
          return { isMatch: true, score: 2, branch: 'A', summary: '化险为夷 / 艺术变现', advice: '品味审美极佳且懂得自我克制。适合高端服务业艺术公关，能利用社交资源作为跳板游刃有余。', supp: '能结识艺术界宗教界或极具魅力的贵人。', isAdv, advText };
        } else if (sfStars.includes('地空') || sfStars.includes('华盖')) {
          return { isMatch: true, score: -2, branch: 'B', summary: '轻度化解 / 信仰寄托', advice: '出世哲思与入世欲望反复博弈。建议将精力转移至精神修行或专业学术研究上，平息内躁动。', supp: '出世入世交战，宜寻找精神寄托。', isAdv, advText };
        } else {
          return { isMatch: true, score: -6, branch: 'C', summary: '绝对成格 / 贪欲倾败', advice: '理智极易被过度物欲嗜好蒙蔽！一生极易因沉迷娱乐高杠杆投机致身败名裂。建立极高道德底线！', supp: '极易被狐朋狗友带入歧途或感情复杂。', isAdv, advText };
        }
      } return { isMatch: false };
    }
  },
  {
    id: '37', name: '【命无正曜格】 借力打力格',
    check: (ctx) => {
      const { cStars, isCurEmpty, sfBadCount, pName, i } = ctx;
      if (pName === '命宫' && isCurEmpty) {
        const isAdv = ['命宫', '财帛宫', '官禄宫', '迁移宫', '夫妻宫'].includes(pName);
        let advText = "无主心骨随波逐流，财运不稳易被合伙人掏空，事业无方向频繁跳槽。";
        if (ctx.hasMutagenPalace((i+6)%12, '禄') && !ctx.hasMutagenPalace((i+6)%12, '忌') && sfBadCount === 0) {
          return { isMatch: true, score: 5, branch: 'A', summary: '完美翻盘 / 海纳百川', advice: '具备极强环境适应整合能力。平台依赖型人才，追随有实力领导即平步青云，适合跨界操盘手中介。', supp: '代表领域缺乏内部支撑，需依托对宫环境弥补。', isAdv, advText };
        } else if (!ctx.hasMutagenPalace((i+6)%12, '忌') && (cStars.includes('禄存') || cStars.includes('文昌'))) {
          return { isMatch: true, score: -2, branch: 'B', summary: '轻度化解 / 灵活多变', advice: '弹性多面手。建议掌握几门跨界技能，寻找强势决策伴侣合伙人担任主心骨，人生安稳顺遂。', supp: '缺乏主心骨，宜结伴而行。', isAdv, advText };
        } else {
          return { isMatch: true, score: -7, branch: 'C', summary: '绝对成格 / 随波逐流', advice: '底盘极弱极易被恶劣环境同化吞噬！最怕交错朋友跟错老板，绝对禁止群体盲目投资！遇事听理智长辈意见。', supp: '该宫代表领域流失极大，切忌过度依赖。', isAdv, advText };
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
      hasMutagenPalace: (idx: number, type: string) => hasMutagenPalace(palaces, idx, type),
      hasMutagenJia: (type: string) => checkMutagenJia(palaces, i, type)
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

  return results.sort((a, b) => b.finalScore - a.finalScore);
}
