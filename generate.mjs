// 每日知识生成脚本 —— 由 GitHub Actions 定时运行（cron: 北京 00:00）
// 世界史/中国史：维基百科「历史上的今天」API（真实、每日不同、有出处）
// 毛选/AI：预置精选池每日随机；若设置了 AI_API_KEY 则改用大模型生成
import { writeFileSync } from 'fs';

const today = new Date();
const mm = today.getUTCMonth() + 1;
const dd = today.getUTCDate();
const dateStr = today.toISOString().split('T')[0];

// ---- 维基百科：历史上的今天 ----
async function fetchOnThisDay() {
  const url = `https://zh.wikipedia.org/api/rest_v1/feed/onthisday/events/${mm}/${dd}`;
  try {
    const r = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'self-learning-bot/1.0 (educational)' }
    });
    if (!r.ok) return [];
    const j = await r.json();
    return j.events || [];
  } catch (e) {
    console.warn('维基百科获取失败:', e.message);
    return [];
  }
}

const CN_KEYWORDS = ['中国','中华','汉','唐','宋','元','明','清','秦','隋','北京','中原','华夏','三国','战国','春秋','秦始皇','周朝','商','辽','金','西夏','民国','慈禧','康有为','梁启超','毛泽东','邓小平','长征','鸦片'];
function isChina(text) { return CN_KEYWORDS.some(k => text.includes(k)); }

// ---- 预置精选池（无 AI key 时每日随机） ----
const WORLD_POOL = [
  { title: '苏格拉底与理性思辨', content: '苏格拉底（前469—前399）以“精神助产术”不断追问，逼人自省，奠定西方理性传统，最终饮鸩殉道。', source: '《西方哲学史》' },
  { title: '罗马帝国的兴衰', content: '公元前27年屋大维称“奥古斯都”，罗马进入帝国时代；扩张带来繁荣，也埋下分裂与衰亡的隐患。', source: '世界历史专题' },
  { title: '文艺复兴的曙光', content: '14世纪始于意大利的文艺复兴提倡人性、理性与艺术，达·芬奇、米开朗基罗、莎士比亚群星闪耀。', source: '欧洲文化史' },
  { title: '法国大革命', content: '1789年巴士底狱被攻陷，《人权宣言》宣告人生而自由平等，启蒙思想点燃了现代政治的星火。', source: '启蒙运动史' },
  { title: '工业革命的轰鸣', content: '18世纪60年代蒸汽机让机器取代手工，城市化加速，资本主义迅猛发展，世界从此改变。', source: '全球经济史' },
  { title: '美国独立战争', content: '1776年《独立宣言》宣告脱离英国，华盛顿率军苦战，创立首个现代立宪共和联邦。', source: '美国建国史' },
  { title: '明治维新', content: '1868年起日本全盘西化，富国强兵，数十年间跻身列强，也埋下军国主义隐患。', source: '日本近代史' },
  { title: '第一次世界大战', content: '1914年萨拉热窝事件引爆全球战火，四大帝国瓦解，凡尔赛和约却埋下二战伏笔。', source: '一战简史' }
];

const CHINA_POOL = [
  { title: '孔子与仁学', content: '孔子（前551—前479）以“仁”“礼”为核心，主张“己所不欲，勿施于人”，开创影响东亚两千年的儒家。', source: '《论语》' },
  { title: '秦统一六国', content: '公元前221年秦王嬴政灭六国，书同文、车同轨、设郡县，奠定中国大一统的制度范式。', source: '《史记》' },
  { title: '汉武盛世', content: '汉武帝尊儒术、开丝路、击匈奴，卫青霍去病北逐大漠，汉成为当时世界最强国家之一。', source: '《汉书》' },
  { title: '贞观之治', content: '唐太宗以隋亡为鉴，广纳谏言、轻徭薄赋，被四方尊为“天可汗”，成就治世典范。', source: '《贞观政要》' },
  { title: '郑和下西洋', content: '1405—1433年郑和七下西洋，宝船远抵非洲东岸，比哥伦布早八十七年，后明清海禁错失大航海。', source: '《明史》' },
  { title: '康乾盛世', content: '康熙、雍正、乾隆三朝疆域辽阔、经济繁荣，却因闭关锁国与文字狱，于盛世中暗藏衰机。', source: '清史讲座' },
  { title: '丝绸之路', content: '自汉代张骞通西域，驼铃连接长安与罗马，丝绸、瓷器、佛法西去东来，文明由此交汇。', source: '中西交通史' },
  { title: '四大发明', content: '造纸、印刷、火药、指南针由中国先后传入西方，被马克思誉为“预告资产阶级社会到来”的杠杆。', source: '科技史' }
];

const MAO_POOL = [
  { title: '《实践论》：认识依赖于实践', content: '“你要知道梨子的滋味，你就得变革梨子，亲口吃一吃。”认识来源于实践，理论必须与实际相结合，反对脱离实际的教条主义。', source: '《毛泽东选集》第一卷' },
  { title: '抓住主要矛盾', content: '“在复杂的事物的发展过程中，有许多的矛盾存在，其中必有一种是主要的矛盾。”集中力量解决主要矛盾，才能推动全局发展。', source: '《矛盾论》' },
  { title: '调查研究就是解决问题', content: '“没有调查，没有发言权。”一切结论产生于调查情况的末尾，而不是在它的先头。调查像“十月怀胎”，解决像“一朝分娩”。', source: '《反对本本主义》' },
  { title: '论持久战：战略分析范例', content: '抗战初期，毛泽东全面分析中日特点，驳斥“速胜论”与“亡国论”，指出战争是持久战，最终胜利属于中国。', source: '《论持久战》' },
  { title: '群众路线的工作方法', content: '“从群众中来，到群众中去。”将分散意见集中起来化为系统意见，再到群众中宣传解释，化为群众的行动。', source: '《关于领导方法的若干问题》' },
  { title: '实事求是：根本原则', content: '“‘实事’就是客观存在着的一切事物，‘是’就是客观事物的内部联系，‘求’就是我们去研究。”这是马克思主义的精髓。', source: '《改造我们的学习》' },
  { title: '批评与自我批评', content: '“知无不言，言无不尽，言者无罪，闻者足戒，有则改之，无则加勉。”这是党内生活的有力武器。', source: '延安整风文献' },
  { title: '星星之火，可以燎原', content: '面对革命低潮的悲观，毛泽东以“星星之火，可以燎原”鼓舞信心，指出革命高潮“是站在海岸遥望海中已经看得见桅杆尖头了的一只航船”。', source: '《星星之火，可以燎原》' },
  { title: '独立自主，自力更生', content: '“我们的方针要放在什么基点上？放在自己力量的基点上，叫做自力更生。”外援为辅，立足自身才是根本。', source: '《抗日战争胜利后的时局》' },
  { title: '兵民是胜利之本', content: '“战争的伟力之最深厚的根源，存在于民众之中。”动员了全国的老百姓，就造成了陷敌于灭顶之灾的汪洋大海。', source: '《论持久战》' },
  { title: '集中优势兵力', content: '“对于人，伤其十指不如断其一指；对于敌，击溃其十个师不如歼灭其一个师。”这是我军作战的基本方法。', source: '《集中优势兵力，各个歼灭敌人》' },
  { title: '有的放矢', content: '“有的放矢”即不以主观想象代替客观事实，而是要像射箭对着靶子，使理论和实际相统一。', source: '《整顿党的作风》' },
  { title: '人不犯我，我不犯人', content: '“人不犯我，我不犯人；人若犯我，我必犯人。”确立了我党在统一战线中既联合又斗争的原则。', source: '《和中央社、扫荡报、新民报三记者的谈话》' },
  { title: '愚公移山', content: '毛泽东以愚公移山比喻中国人民只要坚持不懈，就能搬走帝国主义和封建主义两座大山。', source: '《愚公移山》' },
  { title: '没有调查就没有发言权', content: '“调查就像‘十月怀胎’，解决问题就像‘一朝分娩’。调查就是解决问题。”开会之前须先作调查。', source: '《反对本本主义》' }
];

const AI_POOL = [
  { title: '高效 Prompt 公式', content: '明确角色+任务+格式+限制。例如：“你是一名资深编辑，请将以下要点改写成200字新闻稿，语气专业，避免夸张。”越具体，输出越可控。', source: 'AI提示工程' },
  { title: 'AI辅助阅读长文档', content: '将PDF或长文交给AI，用指令：“总结核心观点，列出三个论据，并用表格对比”，把两小时阅读压缩到十分钟。', source: 'AI办公技巧' },
  { title: '用AI头脑风暴', content: '面对空白文档，让AI生成10个创意方向，再挑出3个深化：“给我10个关于‘提高学习动力’的产品点子。”', source: '创造力工具' },
  { title: '自动化邮件与报告', content: '通过 AI + 快捷指令/脚本，按模板自动生成周报、回复常规邮件，每天节省1—2小时重复劳动。', source: '效率自动化' },
  { title: '用AI学习新领域', content: '“我是初中生，请用简单比喻解释量子计算”，再让它出题考你并纠正错误，快速建立认知框架。', source: '学习加速' },
  { title: 'AI帮你调试代码', content: '把报错信息直接复制给AI：“这段代码为什么报错？请指出原因并给出修改后的完整代码”，大幅减少搜索时间。', source: '开发者必备' },
  { title: '会议纪要自动整理', content: '用AI转录会议录音并生成结构化纪要：“请将以下对话总结为议题、决定、待办事项三部分。”', source: '会议效率' },
  { title: '多语言翻译与润色', content: '先用AI直译，再让AI以目标语言母语者身份润色，搭配术语表效果更佳，译文更地道。', source: '翻译实践' },
  { title: '让AI扮演批评者', content: '“请你扮演严厉的审稿人，指出这份方案最薄弱的三个环节。”反向视角能补上思考盲点。', source: '创造力工具' },
  { title: 'AI辅助做PPT大纲', content: '指令：“为‘数字化转型’主题生成12页PPT大纲，每页含标题与3个要点。”再用工具一键生成版式。', source: '演示技巧' },
  { title: '用AI管理待办', content: '把杂乱事项丢给AI：“请按紧急—重要矩阵归类下列任务，并给出今日的执行顺序。”', source: '时间管理' },
  { title: 'AI生成测试用例', content: '“为这个登录函数写10条边界测试用例，覆盖空值、超长、特殊字符。”让AI补齐测试盲区。', source: '开发者必备' },
  { title: '用AI练习外语口语', content: '“我们用法语进行5分钟日常对话，你扮演咖啡店店员，纠错我的语法。”低成本沉浸式练习。', source: '语言学习' },
  { title: '让AI做第二大脑', content: '把会议记录、读书笔记持续喂给AI并建立索引，日后问“我上个月关于X的想法是什么”，它替你回忆。', source: '个人知识管理' },
  { title: '用AI写周报框架', content: '给AI三要素：本周做了什么、遇到什么卡点、下周计划。让它按“成果—问题—下一步”结构输出，干净利落。', source: '效率自动化' }
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ---- 可选：大模型生成（设置 AI_API_KEY 时启用） ----
async function genByAI(prompt) {
  const key = process.env.AI_API_KEY;
  if (!key) return null;
  const base = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  try {
    const r = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.8
      })
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j.choices?.[0]?.message?.content?.trim() || null;
  } catch { return null; }
}

async function main() {
  const events = await fetchOnThisDay();
  const cn = events.filter(e => isChina(e.text));
  const world = events.filter(e => !isChina(e.text));

  const worldEv = world.length ? pick(world) : null;
  const cnEv = cn.length ? pick(cn) : null;

  const out = { date: dateStr };

  out.world = worldEv
    ? { title: '历史上的今天', content: worldEv.text, source: '维基百科·历史上的今天' }
    : pick(WORLD_POOL);

  out.china = cnEv
    ? { title: '历史上的今天', content: cnEv.text, source: '维基百科·历史上的今天' }
    : pick(CHINA_POOL);

  // 毛选 / AI：有 key 走 AI，否则预置池随机
  const maoText = await genByAI('用中文写一条80字以内的毛泽东处理问题的方法或毛选中的名言，附上出处。只需正文。');
  out.mao = maoText
    ? { title: '毛选智慧', content: maoText, source: 'AI生成·毛选智慧' }
    : pick(MAO_POOL);

  const aiText = await genByAI('用中文写一条80字以内的AI使用技巧，对工作效率有帮助。只需正文。');
  out.ai = aiText
    ? { title: 'AI 技巧', content: aiText, source: 'AI生成·效率技巧' }
    : pick(AI_POOL);

  writeFileSync('today.json', JSON.stringify(out, null, 2), 'utf-8');
  console.log('已生成 today.json:', dateStr);
  console.log(JSON.stringify(out, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
