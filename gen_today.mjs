// gen_today.mjs
// 由 GitHub Actions 在美国 runner 上每天运行：抓取维基百科「历史上的今天」，
// 生成 today.json（含 date + world/china/mao/ai 四块）。
import fs from 'fs';

const NOW = new Date();
const MM = String(NOW.getUTCMonth() + 1).padStart(2, '0');
const DD = String(NOW.getUTCDate()).padStart(2, '0');
const DATE = NOW.toISOString().slice(0, 10);
// 当日序号（用于确定性选条，保证当天多次生成结果一致）
const DAY_OF_YEAR = Math.floor((Date.now() - Date.UTC(NOW.getUTCFullYear(), 0, 0)) / 86400000);

const CN_KW = ['中国','中华','汉','唐','宋','元','明','清','秦','隋','北京','中原','华夏','三国','战国','春秋','秦始皇','周朝','商','辽','金','西夏','民国','长征','鸦片','慈禧','中华人民共和国','改革开放','辛亥'];
const isChina = t => CN_KW.some(k => t.includes(k));

// 毛选静态池（轮换）
const MAO = [
  { title: '批评与自我批评', content: '“知无不言，言无不尽，言者无罪，闻者足戒，有则改之，无则加勉。”这是党内生活的有力武器。', source: '延安整风文献' },
  { title: '实事求是', content: '“实事”就是客观存在着的一切事物，“是”就是客观事物的内部联系即规律性，“求”就是我们去研究。', source: '《改造我们的学习》' },
  { title: '群众路线', content: '一切为了群众，一切依靠群众，从群众中来，到群众中去。这是党的根本工作路线。', source: '毛泽东思想' },
  { title: '战略上藐视敌人', content: '在战略上我们要藐视一切敌人，在战术上我们要重视一切敌人。', source: '《毛泽东选集》' },
  { title: '调查研究', content: '没有调查，没有发言权。你对于那个问题不能解决吗？那么，你就去调查那个问题的现状和它的历史吧！', source: '《反对本本主义》' },
  { title: '矛盾论', content: '事物发展的根本原因，不是在事物的外部而是在事物的内部，在于事物内部的矛盾性。', source: '《矛盾论》' },
  { title: '持久战', content: '兵民是胜利之本。战争的伟力之最深厚的根源，存在于民众之中。', source: '《论持久战》' },
  { title: '为人民服务', content: '人总是要死的，但死的意义有不同。为人民的利益而死，就比泰山还重。', source: '《为人民服务》' },
];

// AI 静态池（轮换）
const AI = [
  { title: '用AI头脑风暴', content: '面对空白文档，让AI生成10个创意方向，再挑3个深化：“给我10个关于‘提高学习动力’的产品点子。”', source: '创造力工具' },
  { title: '费曼学习法+AI', content: '让AI扮演小白，你用最通俗的话讲清一个概念；讲不通的地方就是你的知识盲区。', source: '学习方法' },
  { title: '提示词四要素', content: '角色 + 任务 + 上下文 + 约束。例：“你是资深编辑，把这段改成口语化短文，限150字。”', source: 'Prompt Engineering' },
  { title: 'AI辅助阅读', content: '把长文丢给AI：“用3句话总结核心观点，并列出2个我可能不同意的地方。”', source: '阅读效率' },
  { title: '反向提问', content: '别只问“怎么做”，问“为什么不该做”。让AI列出反对理由，能避坑。', source: '决策思维' },
  { title: '多模型交叉验证', content: '同一难题问不同模型，对比结论差异，比单信一个更稳。', source: 'AI使用策略' },
  { title: 'AI做复习卡', content: '把笔记发给AI：“生成10张Anki式的问答卡片，难中易各三分之一。”', source: '记忆工具' },
  { title: '用AI复盘', content: '每天结束让AI当教练：“基于我今天做的三件事，给我三条改进建议。”', source: '自我提升' },
];

const pick = (arr, seed) => arr.length ? arr[((seed % arr.length) + arr.length) % arr.length] : null;

async function main() {
  let world = null, china = null;
  try {
    const res = await fetch(`https://zh.wikipedia.org/api/rest_v1/feed/onthisday/events/${MM}/${DD}`, {
      headers: { 'User-Agent': 'self-learning-workbench/1.0' }
    });
    if (res.ok) {
      const j = await res.json();
      const events = (j.events || []).map(e => ({ text: e.text || '' })).filter(e => e.text.trim());
      const cn = events.filter(e => isChina(e.text));
      const worldArr = events.filter(e => !isChina(e.text));
      china = cn.length ? pick(cn, DAY_OF_YEAR) : pick(events, DAY_OF_YEAR);
      world = worldArr.length ? pick(worldArr, DAY_OF_YEAR + 1) : pick(events, DAY_OF_YEAR + 1);
    } else {
      console.warn('维基返回非 200:', res.status);
    }
  } catch (e) {
    console.warn('维基抓取失败（runner 应可访问）:', e.message);
  }

  const out = {
    date: DATE,
    world: world
      ? { title: '历史上的今天', content: world.text, source: '维基百科·历史上的今天' }
      : pick(MAO, DAY_OF_YEAR),
    china: china
      ? { title: '历史上的今天', content: china.text, source: '维基百科·历史上的今天' }
      : pick(MAO, DAY_OF_YEAR + 1),
    mao: pick(MAO, DAY_OF_YEAR),
    ai: pick(AI, DAY_OF_YEAR + 1),
  };

  fs.writeFileSync('today.json', JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log('✓ 已生成 today.json 日期:', DATE, '| world:', out.world.title, '| china:', out.china.title);
}

main().catch(e => { console.error('生成失败:', e); process.exit(1); });
