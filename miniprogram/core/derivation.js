// 推导过程（PRD 7.3）：每一步一句话，引用的日期和时刻全部由程序生成
const { Solar } = require('lunar-javascript');
const { addMinutes, toUtcMs } = require('./wallTime');
const { SHICHEN, shichenOf, shichenRange } = require('./shichen');
const { dateCn, monthDayCn, hm, minutesDelta } = require('./format');

const LATE_ZI = 12;

function correctionText(result) {
  const { method, localWall, corrections } = result;
  let text = method.dstApplied ? '，已按夏令时减去 1 小时' : '';
  if (method.trueSolarApplied) {
    text += `；真太阳时 ${hm(localWall)}（${method.city.name}，经度 ${minutesDelta(corrections.longitudeMinutes)}、均时差 ${minutesDelta(corrections.equationMinutes)}）`;
  } else {
    text += '，未启用真太阳时';
  }
  return `${text}。`;
}

function inputLine(result) {
  const { input, inputWall } = result;
  if (input.precision === 'unknown') return `输入日期：${dateCn(inputWall)}，时辰不详，只推年、月、日三柱。`;
  if (input.precision === 'shichen') {
    const s = SHICHEN[input.shichen];
    const { mid } = shichenRange(inputWall, input.shichen);
    return `输入时间：${dateCn(inputWall)} ${s.name}（${s.start}–${s.end}），按 ${hm(mid)} 计算（北京时间）${correctionText(result)}`;
  }
  return `输入时间：${dateCn(inputWall)} ${hm(inputWall)}（北京时间）${correctionText(result)}`;
}

function yearLine(result) {
  const { liChun } = result.terms;
  const [year] = result.pillars;
  const side = toUtcMs(result.beijingWall) >= liChun.utcMs ? '后' : '前';
  return `年柱：在立春（${dateCn(liChun.wall)} ${hm(liChun.wall)}）之${side} → ${year.gan}${year.zhi}年。`;
}

function monthLine(result) {
  const { prevJie, nextJie } = result.terms;
  const [year, month] = result.pillars;
  return `月柱：在${prevJie.name}（${monthDayCn(prevJie.wall)} ${hm(prevJie.wall)}）之后、${nextJie.name}之前 → 月支为${month.zhi}；年干${year.gan}，按五虎遁得月干${month.gan} → ${month.gan}${month.zhi}。`;
}

function dayLine(result) {
  const day = result.pillars[2];
  const gz = `${day.gan}${day.zhi}`;
  if (result.localWall.hour === 23 && result.input.precision !== 'unknown') {
    return result.input.ziSect === 'late23'
      ? `日柱：晚子时按“23:00 换日”计入次日 → ${gz}。`
      : `日柱：晚子时按“0:00 换日”仍计当日 → ${gz}。`;
  }
  return `日柱：按六十甲子连续计日 → ${gz}。`;
}

function nextDayGan(w) {
  const next = addMinutes({ ...w, hour: 0, minute: 0 }, 24 * 60);
  return Solar.fromYmd(next.year, next.month, next.day).getLunar().getDayGan();
}

function timeLine(result) {
  const { localWall, pillars } = result;
  const time = pillars[3];
  const s = SHICHEN[shichenOf(localWall)];
  const gz = `${time.gan}${time.zhi}`;
  if (s.index === LATE_ZI) {
    return `时柱：${hm(localWall)} 属晚子时（${s.start}–${s.end}）；按次日日干${nextDayGan(localWall)}，用五鼠遁得时干${time.gan} → ${gz}。`;
  }
  return `时柱：${hm(localWall)} 属${s.name}（${s.start}–${s.end}）；日干${pillars[2].gan}，按五鼠遁得时干${time.gan} → ${gz}。`;
}

function buildDerivation(result) {
  const lines = [inputLine(result), yearLine(result), monthLine(result), dayLine(result)];
  if (result.input.precision !== 'unknown') lines.push(timeLine(result));
  return lines;
}

module.exports = { buildDerivation };
