const test = require('node:test');
const assert = require('node:assert/strict');
const { JIA_ZI, monthOptionsForYear, timeOptionsForDay } = require('../../miniprogram/core/pillarOptions');

test('JIA_ZI', () => {
  assert.equal(JIA_ZI.length, 60);
  assert.equal(JIA_ZI[59], '癸亥');
});
test('options', () => {
  assert.deepEqual([monthOptionsForYear('庚午')[0], monthOptionsForYear('庚午')[11]], ['戊寅', '己丑']);
  assert.equal(monthOptionsForYear('甲辰')[0], '丙寅');
  assert.equal(monthOptionsForYear('戊午')[0], '甲寅');
  assert.equal(timeOptionsForDay('丁丑', 'late23')[0].ganzhi, '庚子');
  assert.equal(timeOptionsForDay('丁丑', 'late23').length, 12);
  assert.deepEqual(timeOptionsForDay('丁丑', 'late23')[6], { ganzhi: '丙午', label: '午时' });
  assert.equal(timeOptionsForDay('丁丑', 'midnight').length, 13);
  assert.deepEqual(timeOptionsForDay('丁丑', 'midnight')[0], { ganzhi: '庚子', label: '早子时' });
  assert.deepEqual(timeOptionsForDay('丁丑', 'midnight').at(-1), { ganzhi: '壬子', label: '晚子时' });
  assert.deepEqual(timeOptionsForDay('癸酉', 'midnight').at(-1).ganzhi, '甲子');
});
test('unknown input gives []', () => {
  assert.deepEqual(monthOptionsForYear(''), []);
  assert.deepEqual(timeOptionsForDay(null, 'late23'), []);
});
