// gen_today.mjs — 每日生成 today.json
// 优先：调用 DeepSeek API 生成中文深度历史（需 env DEEPSEEK_API_KEY）
// 回退：从 index.html 的 knowledgeBase 按日期提取（无 key 时）
import fs from 'fs';

const NOW = new Date();
const DATE = NOW.toISOString().slice(0, 10);
const dayOfYear = Math.floor(
  (Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth(), NOW.getUTCDate()) -
    Date.UTC(NOW.getUTCFullYear(), 0, 0)) / 86400000
);

// ---------- 回退：从 index.html 提取 ----------
function fromKnowledgeBase() {
  const html = fs.readFileSync('index.html', 'utf8');
  const m = html.match(/const knowledgeBase = (\[[\s\S]*?\n  \]);/);
  if (!m) throw new Error('未找到 knowledgeBase');
  const kb = new Function('return ' + m[1])();
  const byCat = c => kb.filter(x => x.cat === c).sort((a, b) => a.id - b.id);
  const pick = (arr) => (arr.length ? arr[dayOfYear % arr.length] : null);
  const mk = (x) => ({ title: x.title, content: x.content, source: x.source || '知识库' });
  return {
    world: mk(pick(byCat('world'))),
    china: mk(pick(byCat('china'))),
    mao: mk(pick(byCat('mao'))),
    ai: mk(pick(byCat('ai')))
  };
}

// ---------- AI：调用 DeepSeek ----------
async function callDeepSeek(key, cat) {
  const isWorld = cat === 'world';
  const prompt = `你是一位严谨的历史学者。请生成一条"${isWorld ? '世界历史' : '中国历史'}"深度知识卡片，主题是真实存在、广为人知的重要历史事件或时期。
要求：
1. 标题：一个具体的史实标题（如"第一次世界大战的导火索"）
2. 正文：150-250字，按"背景—过程—影响"展开，信息准确、有脉络感
3. 请以日期种子 ${dayOfYear} 为依据，选取一个契合或有代表性的主题，避免与常见模板重复
只返回 JSON：{"title":"...","content":"...","source":"DeepSeek 生成"}`;
  const resp = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是历史知识卡片生成器，只返回 JSON，不要任何额外文字。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.85,
      response_format: { type: 'json_object' }
    })
  });
  if (!resp.ok) throw new Error('DeepSeek HTTP ' + resp.status);
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('DeepSeek 返回为空');
  const obj = JSON.parse(content);
  if (!obj.title || !obj.content) throw new Error('DeepSeek 返回格式异常');
  obj.source = 'DeepSeek 生成';
  return obj;
}

async function main() {
  let world, china, mao, ai;
  const key = process.env.DEEPSEEK_API_KEY;
  if (key) {
    console.log('✓ 检测到 DEEPSEEK_API_KEY，调用 AI 生成世界/中国深度历史…');
    try {
      const [w, c] = await Promise.all([callDeepSeek(key, 'world'), callDeepSeek(key, 'china')]);
      world = w; china = c;
      console.log('  AI世界:', world.title);
      console.log('  AI中国:', china.title);
    } catch (e) {
      console.warn('⚠ AI 生成失败，回退知识库:', e.message);
      const kb = fromKnowledgeBase();
      world = world || kb.world; china = china || kb.china;
    }
    // 毛选/AI 始终用内置库
    const kb = fromKnowledgeBase();
    mao = kb.mao; ai = kb.ai;
  } else {
    console.log('⚠ 未检测到 DEEPSEEK_API_KEY，回退从 index.html 知识库提取');
    const kb = fromKnowledgeBase();
    world = kb.world; china = kb.china; mao = kb.mao; ai = kb.ai;
  }

  const out = { date: DATE, world, china, mao, ai };
  fs.writeFileSync('today.json', JSON.stringify(out, null, 2));
  console.log(`✓ 已生成 today.json (${DATE})`);
  console.log('  世界:', out.world.title);
  console.log('  中国:', out.china.title);
  console.log('  毛选:', out.mao.title);
  console.log('  AI  :', out.ai.title);
}

main().catch(e => { console.error('✗ 生成失败:', e.message); process.exit(1); });
