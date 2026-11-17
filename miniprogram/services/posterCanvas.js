// 分享图片绘制（PRD 7.4）。图片是独立产物，固定使用浅色令牌值，不随深色模式变化。
const POSTER_COLORS = { paper: '#F7F5F0', ink: '#1C1C1A', ink2: '#6B6862', line: '#E4E0D8' };
const WIDTH = 600;
const HEIGHT = 800;
const PADDING = 40;
const FONT = '"PingFang SC", "Microsoft YaHei", sans-serif';

function wrapText(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const ch of Array.from(text)) {
    if (ctx.measureText(line + ch).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line += ch;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function paint(ctx, spec) {
  const byRole = role => spec.lines.find(l => l.role === role).text;
  ctx.fillStyle = POSTER_COLORS.paper;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = POSTER_COLORS.ink2;
  ctx.font = `28px ${FONT}`;
  ctx.fillText(byRole('title'), WIDTH / 2, 80);

  // 四柱表：列名 / 天干 / 地支
  const cols = spec.columns;
  const colWidth = (WIDTH - PADDING * 2) / cols.length;
  cols.forEach((c, i) => {
    const x = PADDING + colWidth * (i + 0.5);
    ctx.fillStyle = POSTER_COLORS.ink2;
    ctx.font = `24px ${FONT}`;
    ctx.fillText(c.label, x, 190);
    ctx.fillStyle = POSTER_COLORS.ink;
    ctx.font = `600 72px ${FONT}`;
    ctx.fillText(c.gan, x, 290);
    ctx.fillText(c.zhi, x, 390);
  });
  ctx.strokeStyle = POSTER_COLORS.line;
  ctx.beginPath();
  ctx.moveTo(PADDING, 460);
  ctx.lineTo(WIDTH - PADDING, 460);
  ctx.stroke();

  ctx.fillStyle = POSTER_COLORS.ink;
  ctx.font = `30px ${FONT}`;
  ctx.fillText(byRole('body'), WIDTH / 2, 520);

  ctx.fillStyle = POSTER_COLORS.ink2;
  ctx.font = `22px ${FONT}`;
  wrapText(ctx, byRole('small'), WIDTH - PADDING * 2).forEach((line, i) => {
    ctx.fillText(line, WIDTH / 2, 680 + i * 34);
  });
}

/** 在页面内的 <canvas type="2d" id="poster-canvas"> 上绘制，返回临时文件路径 */
function draw(page, spec) {
  return new Promise((resolve, reject) => {
    wx.createSelectorQuery().in(page).select('#poster-canvas').fields({ node: true, size: true }).exec(res => {
      const node = res && res[0] && res[0].node;
      if (!node) {
        reject(new Error('NO_CANVAS'));
        return;
      }
      const dpr = wx.getWindowInfo().pixelRatio || 2;
      node.width = WIDTH * dpr;
      node.height = HEIGHT * dpr;
      const ctx = node.getContext('2d');
      ctx.scale(dpr, dpr);
      paint(ctx, spec);
      wx.canvasToTempFilePath({
        canvas: node,
        width: WIDTH,
        height: HEIGHT,
        destWidth: WIDTH * 2,
        destHeight: HEIGHT * 2,
        success: r => resolve(r.tempFilePath),
        fail: reject,
      });
    });
  });
}

module.exports = { draw, WIDTH, HEIGHT };
