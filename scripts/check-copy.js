// 扫描 miniprogram/ 下的禁用词与禁用接口（PRD 14.3），命中即失败
const fs = require('fs');
const path = require('path');
const { BANNED_WORDS, BANNED_APIS, ALLOWED_PHRASES } = require('./banned');

const ROOT = path.join(__dirname, '..', 'miniprogram');
const EXTENSIONS = new Set(['.js', '.json', '.wxml', '.wxss']);
const SKIP_DIRS = new Set(['miniprogram_npm', 'node_modules']);
const API_PATTERNS = BANNED_APIS.map(api => ({ api, re: new RegExp(`\\b${api}`) }));

function findViolations(text) {
  const violations = [];
  String(text).split('\n').forEach((raw, i) => {
    const line = ALLOWED_PHRASES.reduce((s, phrase) => s.split(phrase).join(''), raw);
    for (const word of BANNED_WORDS) if (line.includes(word)) violations.push({ kind: 'word', value: word, line: i + 1 });
    for (const { api, re } of API_PATTERNS) if (re.test(line)) violations.push({ kind: 'api', value: api, line: i + 1 });
  });
  return violations;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, out);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

function main() {
  let failed = false;
  for (const file of walk(ROOT)) {
    const rel = path.relative(path.join(__dirname, '..'), file);
    for (const v of findViolations(fs.readFileSync(file, 'utf8'))) {
      failed = true;
      console.error(v.kind === 'word' ? `${rel}:${v.line} 禁用词「${v.value}」` : `${rel}:${v.line} 禁用接口 ${v.value}`);
    }
  }
  if (failed) return 1;
  console.log('copy check passed');
  return 0;
}

if (require.main === module) process.exit(main());

module.exports = { findViolations };
