// src/utils/vCoreEngine.ts
import { Vector5D, STAR_SYSTEMS, AFFLICTIONS, TRANSFORMS, DYNAMIC_STACK_RULES } from './vCoreData';

export type { Vector5D };

// 宫位物理上下文定义
export interface PalaceContext {
  branch: string;           // 地支 (子, 丑...)
  mainStars: string[];      // 主星数组
  minorStars: string[];     // 辅煞星数组
  mutagens: string[];       // 四化数组 (禄, 权, 科, 忌)
  selfMutagen: string | null; // 宫干自化 (禄,权,科,忌, null)
}

// 👑 引擎基座：五维向量数学内核
export class VectorMath {
  // 1. 绝对物理限制器：确保任何相加/相乘都不会击穿 0.1~1.5 的系统红线
  static clamp(v: Vector5D): Vector5D {
    const limit = (val: number) => Math.max(0.1, Math.min(1.5, Number(val.toFixed(2))));
    return { F: limit(v.F), P: limit(v.P), E: limit(v.E), S: limit(v.S), W: limit(v.W) };
  }

  // 2. 线性加法器 (辅煞星注入)
  static add(base: Vector5D, modifier: Vector5D): Vector5D {
    return this.clamp({
      F: base.F + modifier.F, P: base.P + modifier.P,
      E: base.E + modifier.E, S: base.S + modifier.S, W: base.W + modifier.W
    });
  }

  // 3. 非线性乘法器 (四化变异与格局扭曲)
  static multiply(base: Vector5D, multiplier: Vector5D): Vector5D {
    return this.clamp({
      F: base.F * multiplier.F, P: base.P * multiplier.P,
      E: base.E * multiplier.E, S: base.S * multiplier.S, W: base.W * multiplier.W
    });
  }

  // 4. 阻尼衰减器 Lerp (空宫借四化时的隔山打牛效应)
  static dampMultiplier(multiplier: Vector5D, dampingRate: number = 0.8): Vector5D {
    const lerp = (val: number) => 1.0 + (val - 1.0) * dampingRate;
    return {
      F: lerp(multiplier.F), P: lerp(multiplier.P),
      E: lerp(multiplier.E), S: lerp(multiplier.S), W: lerp(multiplier.W)
    };
  }

  // 5. 差值提取器 (T_Delta)
  static delta(current: Vector5D, natal: Vector5D): Vector5D {
    return {
      F: Number((current.F - natal.F).toFixed(2)), P: Number((current.P - natal.P).toFixed(2)),
      E: Number((current.E - natal.E).toFixed(2)), S: Number((current.S - natal.S).toFixed(2)),
      W: Number((current.W - natal.W).toFixed(2))
    };
  }
}

// 👑 V-Core 核心计算管线
export class VCoreEngine {
  
  // ==========================================
  // 兼容旧版 UI 的快捷方法
  // ==========================================
  static calculatePalaceVector(palace: PalaceContext, oppPalace: PalaceContext): Vector5D {
    const { vector: baseVec, isEmpty } = this.extractBaseVector(palace, oppPalace);
    const afflictedVec = this.applyAfflictions(baseVec, palace);
    const transformedVec = this.applyTransforms(afflictedVec, palace, isEmpty);
    return VectorMath.clamp(transformedVec);
  }

  // ==========================================
  // 管线 1：提取单宫物理基底 (处理空宫与自化)
  // ==========================================
  static extractBaseVector(palace: PalaceContext, oppPalace: PalaceContext): { vector: Vector5D, isEmpty: boolean } {
    let baseVector: Vector5D;
    const isEmpty = palace.mainStars.length === 0;

    if (isEmpty) {
      // 【排雷机制】：空宫借星，基础力量打 8 折，稳定性 S 打 6 折
      const oppStarKey = oppPalace.mainStars.join('');
      const oppBase = STAR_SYSTEMS[oppStarKey]?.vector || { F: 1, P: 1, E: 1, S: 1, W: 1 };
      baseVector = VectorMath.clamp({
        F: oppBase.F * 0.8, P: oppBase.P * 0.8, E: oppBase.E * 0.8,
        S: oppBase.S * 0.6, W: oppBase.W 
      });
    } else {
      const starKey = palace.mainStars.join('');
      baseVector = STAR_SYSTEMS[starKey]?.vector || { F: 1, P: 1, E: 1, S: 1, W: 1 };
      
      // 【排雷机制】：空宫绝对禁止自化！仅有实星时才触发【宫干自化】内耗与内驱引擎
      if (palace.selfMutagen) {
        if (palace.selfMutagen === '忌') { baseVector.S *= 0.7; baseVector.W *= 1.3; } // 画地为牢
        else if (palace.selfMutagen === '禄') { baseVector.F *= 1.2; baseVector.E *= 1.1; } // 自得其乐
        else if (palace.selfMutagen === '权') { baseVector.P *= 1.3; baseVector.E *= 0.8; } // 刚愎自用
        else if (palace.selfMutagen === '科') { baseVector.S *= 1.1; baseVector.E *= 1.1; } // 爱惜羽毛
      }
    }
    return { vector: VectorMath.clamp(baseVector), isEmpty };
  }

  // ==========================================
  // 管线 2：注入辅煞环境 (处理墓库衰减与火贪免伤)
  // ==========================================
  static applyAfflictions(vector: Vector5D, palace: PalaceContext): Vector5D {
    let result = { ...vector };
    const isTomb = ['辰', '戌', '丑', '未'].includes(palace.branch);
    const hasHuoLing = palace.minorStars.includes('火星') || palace.minorStars.includes('铃星');
    const isTanLang = palace.mainStars.includes('贪狼');

    palace.minorStars.forEach(star => {
      const modifier = AFFLICTIONS[star];
      if (!modifier) return;

      // 【机制】：火贪/铃贪暴发协议 (剔除火铃负面)
      if (isTanLang && (star === '火星' || star === '铃星')) {
        // 不注入基础负面，直接等待 Phase 3 暴发覆盖
        return; 
      }

      // 【机制】：四墓库羊陀物理衰减器
      if ((star === '擎羊' || star === '陀罗') && isTomb) {
        const dampened = {
          F: modifier.F < 0 ? modifier.F * 0.3 : modifier.F,
          P: modifier.P + 0.2, // 转化为韧性反补
          E: modifier.E < 0 ? modifier.E * 0.3 : modifier.E,
          S: modifier.S < 0 ? modifier.S * 0.3 : modifier.S,
          W: modifier.W > 0 ? modifier.W * 0.3 : modifier.W,
        };
        result = VectorMath.add(result, dampened);
      } else {
        result = VectorMath.add(result, modifier); // 正常线性注入
      }
    });

    return result;
  }

  // ==========================================
  // 管线 3：四化变异 (处理禄忌交战与空宫阻尼)
  // ==========================================
  static applyTransforms(vector: Vector5D, palace: PalaceContext, isEmpty: boolean): Vector5D {
    let result = { ...vector };
    const hasJi = palace.mutagens.includes('忌');
    const goodMutaCount = palace.mutagens.filter(m => ['禄', '权', '科'].includes(m)).length;

    // 【机制】：忌星一票否决权 (阻断双吉化，引发动荡)
    let isVetoed = false;
    if (goodMutaCount >= 2 && hasJi) {
      result.W *= 2.0; result.S *= 0.5; // 甜蜜陷阱熔断
      isVetoed = true; 
    }

    palace.mutagens.forEach(muta => {
      if (isVetoed && ['禄', '权', '科'].includes(muta)) return; // 被否决的吉化不予执行倍率

      const mainStar = palace.mainStars[0] || ''; 
      let multiplier = TRANSFORMS[`${mainStar}化${muta}`]?.Multiplier || TRANSFORMS[`通用化${muta}`]?.Multiplier;

      if (multiplier) {
        // 【机制】：空宫阻尼衰减效应 (借星四化隔山打牛)
        if (isEmpty) multiplier = VectorMath.dampMultiplier(multiplier, 0.8);
        result = VectorMath.multiply(result, multiplier);
      }
    });

    return result;
  }

  // ==========================================
  // 管线 4：空间融合与格局裁决 (S级覆盖/A级同气)
  // ==========================================
  static evaluateSpatialPattern(
    base: PalaceContext, opp: PalaceContext, tri1: PalaceContext, tri2: PalaceContext,
    prev: PalaceContext, next: PalaceContext, 
    fusedVector: Vector5D // 已完成 50/25/12.5/12.5 融合的基础向量
  ): { vector: Vector5D, tags: string[] } {
    let result = { ...fusedVector };
    const tags: string[] = [];
    const allMain = [...base.mainStars, ...opp.mainStars, ...tri1.mainStars, ...tri2.mainStars];
    const allMinor = [...base.minorStars, ...opp.minorStars, ...tri1.minorStars, ...tri2.minorStars];

    // 🛡️ 检测夹宫 (相邻雷达)
    const prevMinor = prev.minorStars; const nextMinor = next.minorStars;
    const isSheepTuoClamp = (prevMinor.includes('擎羊') && nextMinor.includes('陀罗')) || (prevMinor.includes('陀罗') && nextMinor.includes('擎羊'));

    // 【机制】：羊陀夹忌 (终极死锁) 与 羊陀夹禄 (金库绝对豁免)
    if (isSheepTuoClamp) {
      if (base.mutagens.includes('忌')) {
        tags.push("作茧自缚 (羊陀夹忌)");
        return { vector: { F: 0.1, P: 0.1, E: 0.1, S: 0.1, W: 1.8 }, tags }; // S级凶格直接熔断返回
      } else if (base.minorStars.includes('禄存')) {
        tags.push("金库守卫 (羊陀夹禄)");
        result.S += 0.3; result.W -= 0.2; // 强效防守
      }
    }

    // 🌋 检测 S 级【火贪/铃贪】暴发与熔断
    if (base.mainStars.includes('贪狼') && (base.minorStars.includes('火星') || base.minorStars.includes('铃星'))) {
      if (base.minorStars.includes('地空') || base.minorStars.includes('地劫') || base.mutagens.includes('忌')) {
        tags.push("纸上富贵 (横发横破)");
        return { vector: { F: 0.1, P: 0.1, E: 0.1, S: 0.1, W: 3.0 }, tags }; // 暴败熔断
      } else {
        tags.push("横发暴利 (火贪格)");
        return { vector: { F: 1.6, P: 1.3, E: 0.6, S: 0.3, W: 1.8 }, tags }; // 暴富覆盖
      }
    }

    // ☠️ 检测 S 级【铃昌陀武】(斗数第一凶格)
    if (allMain.includes('武曲') && allMinor.includes('铃星') && allMinor.includes('文昌') && allMinor.includes('陀罗')) {
      tags.push("极端破败 (铃昌陀武)");
      return { vector: { F: 0.1, P: 0.2, E: 0.2, S: 0.1, W: 2.0 }, tags }; // S级毁灭
    }

    // 🏛️ 检测 A 级【机月同梁】(体制防御同气)
    if (['天机', '太阴', '天同', '天梁'].every(s => allMain.includes(s))) {
      tags.push("体制稳健 (机月同梁)");
      result = VectorMath.multiply(result, { F: 1.1, P: 0.8, E: 1.1, S: 1.5, W: 0.5 });
    }

    // ⚔️ 检测 A 级【杀破狼】(开创同气)
    if (['七杀', '破军', '贪狼'].some(s => base.mainStars.includes(s))) {
      tags.push("动荡开创 (杀破狼)");
      result = VectorMath.multiply(result, { F: 1.2, P: 1.4, E: 0.8, S: 0.6, W: 1.5 });
    }

    return { vector: VectorMath.clamp(result), tags };
  }

  // ==========================================
  // 管线 5：时空流转引擎 (推演 T_Delta 差值)
  // ==========================================
  static deduceTimeAxis(
    vNatal: Vector5D, natalPalace: PalaceContext,
    vCurrent: Vector5D, currentPalace: PalaceContext // 传入的大限或流年物理切片
  ): { vFinalDynamic: Vector5D, tDelta: Vector5D, timeTags: string[] } {
    let vDynamic = { ...vCurrent };
    const timeTags: string[] = [];

    // 【核心数学保卫战】：检测跨时空双星共振 (Cross-Layer Synergy)
    // 能量绝对注入到 V_Dynamic (当前切片) 中，确保 T_Delta 演算的数学绝对守恒！
    const pairs = [['左辅', '右弼'], ['天魁', '天钺'], ['文昌', '文曲']];
    pairs.forEach(pair => {
      const hasA_N = natalPalace.minorStars.includes(pair[0]); const hasB_C = currentPalace.minorStars.includes(pair[1]);
      const hasB_N = natalPalace.minorStars.includes(pair[1]); const hasA_C = currentPalace.minorStars.includes(pair[0]);
      if ((hasA_N && hasB_C) || (hasB_N && hasA_C)) {
        vDynamic = VectorMath.add(vDynamic, { F: 0, P: 0.5, E: 0, S: 0.5, W: -0.2 });
        timeTags.push(`跨盘共振 (${pair[0]}+${pair[1]})`);
      }
    });

    // 检测动态叠化 (叠忌 / 叠禄)
    const natalMutagens = natalPalace.mutagens;
    const currentMutagens = currentPalace.mutagens;
    
    if (natalMutagens.includes('忌') && currentMutagens.includes('忌')) {
      vDynamic = VectorMath.multiply(vDynamic, DYNAMIC_STACK_RULES['叠忌'].Multiplier);
      timeTags.push(DYNAMIC_STACK_RULES['叠忌'].tag);
    } else if (natalMutagens.includes('禄') && currentMutagens.includes('禄')) {
      vDynamic = VectorMath.multiply(vDynamic, DYNAMIC_STACK_RULES['叠禄'].Multiplier);
      timeTags.push(DYNAMIC_STACK_RULES['叠禄'].tag);
    } else if ((natalMutagens.includes('禄') && currentMutagens.includes('忌')) || (natalMutagens.includes('忌') && currentMutagens.includes('禄'))) {
      vDynamic = VectorMath.multiply(vDynamic, DYNAMIC_STACK_RULES['禄忌交战'].Multiplier);
      timeTags.push(DYNAMIC_STACK_RULES['禄忌交战'].tag);
    }

    // 最终捍卫等式：计算出趋势差值
    vDynamic = VectorMath.clamp(vDynamic);
    const tDelta = VectorMath.delta(vDynamic, vNatal);

    return { vFinalDynamic: vDynamic, tDelta, timeTags };
  }
}
