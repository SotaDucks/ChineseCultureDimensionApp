// ===== 可配置项 =====
// 五边形点缀色：改这里，或在 URL 后加 ?accent=2bb3a3（不带 #）
export const ACCENT_DEFAULT = '#e4572e';

// 5 个维度：顺序固定（从顶部开始顺时针），不可调整 —— 面积会随顺序变化
export const DIMENSIONS = [
  { key: 'influence', zh: '文化影响力', en: 'Cultural Influence',
    q: '它有多深的文化内涵、多广的认知度？',
    low: '只是一个好看的符号，要解释才知道', high: '内涵深厚，海外受众也能一眼认出' },
  { key: 'resonance', zh: '当代共鸣度', en: 'Contemporary Resonance',
    q: '今天的中国年轻人在乎它吗？',
    low: '只存在于博物馆里', high: '正在日常生活里被使用、讨论、分享' },
  { key: 'novelty', zh: '新颖度', en: 'Novelty',
    q: '它被品牌用滥了吗？',
    low: '很多品牌都做过，包括 Vespa 的生肖系列', high: '很少有品牌碰过' },
  { key: 'brandFit', zh: '品牌契合度', en: 'Brand Fit',
    q: '它和 Vespa 的意式生活、自由出行的气质相通吗？',
    low: '气质冲突，硬凑', high: '能自然地讲成一个 Vespa 的故事' },
  { key: 'translatability', zh: '转译潜力', en: 'Design Translatability',
    q: '它能落到几种设计触点上？',
    low: '只能印成图案', high: '造型、CMF、配件、空间、活动都能用' },
];

export const CATEGORIES = [
  { key: 'arts', zh: '艺术与文学', en: 'Arts & Literature', cover: 'calligraphy' },
  { key: 'heritage', zh: '非遗与文物', en: 'Heritage & Artifacts' },
  { key: 'symbols', zh: '符号与纹样', en: 'Symbols & Patterns' },
  { key: 'everyday', zh: '日常物品', en: 'Everyday Objects' },
  { key: 'festivals', zh: '节庆与民俗', en: 'Festivals & Customs' },
  { key: 'contemporary', zh: '当代生活与流行文化', en: 'Contemporary Life & Pop Culture' },
];

// 改名的大类：旧数据（localStorage / 导入的 JSON）里的旧 key 会自动改成新 key
// 原「色彩与材质 colors」已整体改名为「符号与纹样 symbols」
export const CATEGORY_ALIASES = { colors: 'symbols' };

export const ERAS = [
  { zh: '古代', en: 'Ancient' },
  { zh: '近现代', en: 'Modern' },
  { zh: '当代', en: 'Contemporary' },
];

export const REGIONS = ['岭南', '江南', '北方', '西南', '西北', '少数民族'];

export const TOUCHPOINTS = [
  { key: 'cmf', zh: '车身 CMF', en: 'Body CMF' },
  { key: 'accessories', zh: '配件与骑行装备', en: 'Accessories & Gear' },
  { key: 'retail', zh: '门店空间', en: 'Retail Space' },
  { key: 'community', zh: '社群活动', en: 'Community Events' },
  { key: 'content', zh: '传播内容', en: 'Content' },
];

export const FLAGS = {
  vespaUsed: { zh: 'Vespa 已用过', en: 'Used by Vespa', note: '如 Vespa 946 Lunar Collection 生肖限量版（2023 兔、2024 龙、2025 蛇、2026 马）' },
  culturallySensitive: { zh: '文化敏感', en: 'Culturally Sensitive', note: '涉及宗教、民族服饰等，存在文化挪用争议风险（不参与评分）' },
};

export const catByKey = (k) => CATEGORIES.find((c) => c.key === k) || { zh: k, en: '' };
export const eraByZh = (z) => ERAS.find((e) => e.zh === z);
