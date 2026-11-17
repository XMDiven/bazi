// 禁用词与禁用接口（PRD 14.3、2.2）。本文件不打包进小程序。
const { DISCLAIMER } = require('../miniprogram/core/constants');

const BANNED_WORDS = [
  '算命', '测算', '占卜', '命理', '命盘', '运势', '运程', '吉凶', '预测', '改运', '大师', '风水',
  '开光', '财运', '姻缘', '排盘', '宜忌', '冲煞', '喜用', '旺衰', '十神', '神煞', '大运', '流年',
];

// lunar-javascript 中输出宜忌、吉凶、神煞类信息的方法；按前缀匹配
const BANNED_APIS = [
  'getDayYi', 'getDayJi', 'getTimeYi', 'getTimeJi', 'getDayChong', 'getDaySha', 'getPengZu',
  'getDayJiShen', 'getDayXiongSha', 'getDayPositionTai', 'getDayNineStar', 'getDayTianShen',
  'getShiShen', 'getDayun', 'getYun', 'getTimeChong', 'getTimeSha', 'getTimeTianShen',
];

const ALLOWED_PHRASES = [DISCLAIMER];

module.exports = { BANNED_WORDS, BANNED_APIS, ALLOWED_PHRASES };
