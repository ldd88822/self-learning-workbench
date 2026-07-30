// gen_today.mjs — 从 index.html 的 knowledgeBase 解析深度历史，按日期索引生成 today.json
// 单一来源：只维护 index.html 的知识库，本脚本自动提取，避免重复维护
import fs from 'fs';

const NOW = new Date();
const DATE = NOW.toISOString().slice(0, 10);
// 以 UTC 当年的第几天作为轮换种子（runner 在美国，用 UTC 保证全球同一天一致）
const dayOfYear = Math.floor(
  (Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth(), NOW.getUTCDate()) -
    Date.UTC(NOW.getUTCFullYear(), 0, 0)) / 86400000
);

// 读取仓库内的 index.html，提取 knowledgeBase 数组
const html = fs.readFileSync('index.html', 'utf8');
const m = html.match(/const knowledgeBase = (\[[\s\S]*?\n  \]);/);
if (!m) { console.error('✗ 未找到 knowledgeBase，终止'); process.exit(1); }
let kb;
try {
  kb = new Function('return ' + m[1])();
} catch (e) {
  console.error('✗ 解析 knowledgeBase 失败:', e.message); process.exit(1);
}

const byCat = c => kb.filter(x => x.cat === c).sort((a, b) => a.id - b.id);
const pick = (arr) => (arr.length ? arr[dayOfYear % arr.length] : null);
const mk = (x) => ({ title: x.title, content: x.content, source: x.source || '知识库' });

const world = pick(byCat('world'));
const china = pick(byCat('china'));
const mao = pick(byCat('mao'));
const ai = pick(byCat('ai'));

if (!world || !china || !mao || !ai) {
  console.error('✗ 四个分类数据不全，终止'); process.exit(1);
}

const out = {
  date: DATE,
  world: mk(world),
  china: mk(china),
  mao: mk(mao),
  ai: mk(ai)
};

fs.writeFileSync('today.json', JSON.stringify(out, null, 2));
console.log(`✓ 已生成 today.json (${DATE})`);
console.log('  世界:', out.world.title);
console.log('  中国:', out.china.title);
console.log('  毛选:', out.mao.title);
console.log('  AI  :', out.ai.title);
