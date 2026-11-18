const APP_NAME = '干支历换算';
const SUBTITLE = '公历、农历与干支历换算';
const DISCLAIMER = '本工具仅提供传统干支历法的日期换算与文化科普，不提供任何命运解读或预测，请理性看待传统文化。';
// 换算页底栏一行放不下原文，只在该处使用短版（PRD 2.4）；其余位置一律用原文
const DISCLAIMER_SHORT = '仅供历法换算与文化科普，不提供命运解读';
const ME_HEADER = '全部数据仅保存在这台手机上';

const MIN_DATE = { year: 1900, month: 1, day: 1 };
const MAX_DATE = { year: 2100, month: 12, day: 31 };

// lunar-javascript 的 EightChar.setSect：1 = 晚子时日柱算次日，2 = 算当日（库默认 2）
const ZI_SECT_TO_LIB = { late23: 1, midnight: 2 };
const ZI_SECT_LABEL = { late23: '23:00 换日', midnight: '0:00 换日' };

const LIMITS = { RECENT: 20, PROFILES: 100, NAME_MAX: 10 };
const BOUNDARY = { JIE_MINUTES: 30, SHICHEN_MINUTES: 10, DAY_MINUTES: 10 };

const STORAGE_KEYS = { PROFILES: 'profiles', RECENT: 'recent', SETTINGS: 'settings', LAST_INPUT: 'lastInput' };
const DEFAULT_SETTINGS = { ziSect: 'late23', useTrueSolarTime: false, cityId: null };

const CHANGELOG = [
  { version: '1.0.0', lines: ['公历、农历与四柱干支换算，附推导过程', '四柱反查、万年历、节气表', '档案、最近记录与知识库'] },
];

module.exports = {
  APP_NAME, SUBTITLE, DISCLAIMER, DISCLAIMER_SHORT, ME_HEADER,
  MIN_DATE, MAX_DATE, ZI_SECT_TO_LIB, ZI_SECT_LABEL,
  LIMITS, BOUNDARY, STORAGE_KEYS, DEFAULT_SETTINGS, CHANGELOG,
};
