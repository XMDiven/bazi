const DEFAULT_INPUT = {
  calendar: 'solar', year: 1990, month: 5, day: 12, isLeapMonth: false,
  precision: 'exact', hour: 12, minute: 0, shichen: 6,
  cityId: null, useTrueSolarTime: false, ziSect: 'late23', applyDst: false,
};

const makeInput = (overrides = {}) => ({ ...DEFAULT_INPUT, ...overrides });
const w = (year, month, day, hour = 0, minute = 0) => ({ year, month, day, hour, minute });
const NOW = { year: 2026, month: 11, day: 17, hour: 12, minute: 0 };
const pad = n => String(n).padStart(2, '0');
const fmt = t => `${t.year}-${pad(t.month)}-${pad(t.day)} ${pad(t.hour)}:${pad(t.minute)}`;

module.exports = { makeInput, w, NOW, pad, fmt };
