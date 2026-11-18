// 边界提示（PRD 6.5）：交节看北京时间，时辰与换日看修正后时刻。距离严格小于阈值才提示。
const { BOUNDARY } = require('./constants');
const { toUtcMs } = require('./wallTime');
const { findAdjacent } = require('./terms');
const { monthDayCn, hm, pad2 } = require('./format');

const MINUTES_PER_DAY = 1440;
// 时辰分界：前一天 23:00、01:00、03:00 … 23:00、次日 01:00（相对当天 0 点的分钟数）
const SHICHEN_MARKS = Array.from({ length: 14 }, (_, k) => (2 * k - 1) * 60);
const DAY_MARKS = { late23: [-60, 23 * 60], midnight: [0, MINUTES_PER_DAY] };

const minuteOfDay = w => w.hour * 60 + w.minute;
const markLabel = mark => `${pad2((((mark / 60) % 24) + 24) % 24)}:00`;

function nearest(m, marks) {
  let best = marks[0];
  for (const mark of marks) if (Math.abs(m - mark) < Math.abs(m - best)) best = mark;
  return { mark: best, distance: Math.abs(m - best) };
}

function jieWarning(beijingWall) {
  const { prev, next } = findAdjacent(beijingWall, { jieOnly: true });
  const t = toUtcMs(beijingWall);
  const near = [prev, next]
    .filter(Boolean)
    .map(term => ({ term, distance: Math.abs(term.utcMs - t) / 60000 }))
    .sort((a, b) => a.distance - b.distance)[0];
  if (!near || near.distance >= BOUNDARY.JIE_MINUTES) return null;
  const { term } = near;
  const target = term.name === '立春' ? '年柱和月柱' : '月柱';
  return `该时刻临近${term.name}交节（${monthDayCn(term.wall)} ${hm(term.wall)}），${target}对出生时间精度敏感`;
}

function shichenWarning(localWall) {
  const { mark, distance } = nearest(minuteOfDay(localWall), SHICHEN_MARKS);
  if (distance >= BOUNDARY.SHICHEN_MINUTES) return null;
  return `该时刻临近时辰分界（${markLabel(mark)}），时柱对出生时间精度敏感`;
}

function dayWarning(localWall, ziSect) {
  const { mark, distance } = nearest(minuteOfDay(localWall), DAY_MARKS[ziSect]);
  if (distance >= BOUNDARY.DAY_MINUTES) return null;
  return `该时刻临近换日（${markLabel(mark)}），日柱对出生时间精度敏感`;
}

function getBoundaryWarnings({ beijingWall, localWall, ziSect }) {
  return [jieWarning(beijingWall), shichenWarning(localWall), dayWarning(localWall, ziSect)].filter(Boolean);
}

module.exports = { getBoundaryWarnings };
