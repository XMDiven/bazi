// data/cities.source.csv → miniprogram/core/data/cities.js（PRD 19.2）
const fs = require('fs');
const path = require('path');

const HEADER = 'province,name,longitude,latitude,source';
const LON_RANGE = [73, 136];
const LAT_RANGE = [3, 54];

const SOURCE = path.join(__dirname, '..', 'data', 'cities.source.csv');
const TARGET = path.join(__dirname, '..', 'miniprogram', 'core', 'data', 'cities.js');

const inRange = (v, [lo, hi]) => Number.isFinite(v) && v >= lo && v <= hi;

function parseCitiesCsv(text) {
  const lines = String(text).replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  const cities = [];
  const errors = [];
  const sources = new Set();
  if (lines[0] !== HEADER) {
    errors.push(`line 1: header must be "${HEADER}"`);
    return { cities, errors, sources: [] };
  }
  const seen = new Set();
  lines.slice(1).forEach((line, i) => {
    const lineNo = i + 2;
    const [province, name, lonText, latText, source] = line.split(',').map(s => (s || '').trim());
    const longitude = Number(lonText);
    const latitude = Number(latText);
    if (!province || !name) return errors.push(`line ${lineNo}: province and name are required`);
    if (!inRange(longitude, LON_RANGE)) return errors.push(`line ${lineNo}: longitude ${lonText} out of range`);
    if (!inRange(latitude, LAT_RANGE)) return errors.push(`line ${lineNo}: latitude ${latText} out of range`);
    const id = `${province}-${name}`;
    if (seen.has(id)) return errors.push(`line ${lineNo}: duplicate ${name} in ${province}`);
    seen.add(id);
    if (source) sources.add(source);
    cities.push({ id, name, province, longitude });
  });
  return { cities, errors, sources: [...sources] };
}

function renderModule(cities, sources) {
  const rows = cities.map(c => `  ${JSON.stringify(c)},`).join('\n');
  return `// 由 scripts/build-cities.js 生成，请勿手改。数据来源：${sources.join('、')}\nmodule.exports = [\n${rows}\n];\n`;
}

function main() {
  if (!fs.existsSync(SOURCE)) {
    console.log('data/cities.source.csv not found — keep seed data (see PRD 19.2)');
    return 0;
  }
  const { cities, errors, sources } = parseCitiesCsv(fs.readFileSync(SOURCE, 'utf8'));
  if (errors.length) {
    errors.forEach(e => console.error(e));
    return 1;
  }
  fs.writeFileSync(TARGET, renderModule(cities, sources));
  console.log(`wrote ${cities.length} cities to miniprogram/core/data/cities.js`);
  return 0;
}

if (require.main === module) process.exit(main());

module.exports = { parseCitiesCsv };
