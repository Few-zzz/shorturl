import { create } from 'qrcode';

// วาด QR Code เป็น SVG เองจากตารางจุดของ library เพื่อปรับสี รูปร่างจุด และกรอบได้
// หน่วยใน SVG คือ 1 จุดของ QR (module)

export type QrShape = 'square' | 'rounded' | 'dots';

export interface QrStyle {
  shape: QrShape;
  fg: string; // สีจุด เลขฐานสิบหก 6 หลัก ไม่มี #
  bg: string; // สีพื้นหลัง
  frame: boolean;
  label: string; // ข้อความใต้ QR เมื่อมีกรอบ
}

const SHAPES: QrShape[] = ['square', 'rounded', 'dots'];
const HEX_COLOR = /^[0-9a-f]{6}$/i;
const MAX_LABEL_LENGTH = 24;
const DEFAULT_LABEL = 'สแกนเลย';
const MIN_CONTRAST = 4;
const QUIET_ZONE = 4; // ขอบว่างรอบ QR ตามมาตรฐาน ต้องมีเสมอเพื่อให้สแกนได้
const OUTPUT_WIDTH = 320;

// ค่าที่รับจาก URL จะถูกใส่ลงใน SVG จึงรับเฉพาะรูปแบบที่กำหนดเท่านั้น
export function parseQrStyle(query: Record<string, unknown>): QrStyle {
  const text = (value: unknown) => (typeof value === 'string' ? value : '');
  const shape = text(query.shape) as QrShape;
  const color = (value: unknown, fallback: string) =>
    HEX_COLOR.test(text(value)) ? text(value).toLowerCase() : fallback;
  const label = [...text(query.label).replace(/[\u0000-\u001f\u007f]/g, '').trim()]
    .slice(0, MAX_LABEL_LENGTH)
    .join('');

  return {
    shape: SHAPES.includes(shape) ? shape : 'square',
    fg: color(query.fg, '000000'),
    bg: color(query.bg, 'ffffff'),
    frame: text(query.frame) === '1',
    label: label || DEFAULT_LABEL,
  };
}

function luminance(hex: string): number {
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// จุดต้องเข้มกว่าพื้นหลังและต่างกันมากพอ กล้องส่วนใหญ่อ่าน QR สีกลับด้านหรือสีจางไม่ได้
// apps/shorturl/public/app.js ใช้กฎเดียวกันเพื่อเตือนผู้ใช้ก่อนส่งคำขอ
export function isScannable(style: QrStyle): boolean {
  const dark = luminance(style.fg);
  const light = luminance(style.bg);
  return light > dark && (light + 0.05) / (dark + 0.05) >= MIN_CONTRAST;
}

const num = (value: number) => String(Math.round(value * 100) / 100);

function roundedRect(x: number, y: number, w: number, h: number, r: number): string {
  if (r <= 0) {
    return `M${num(x)} ${num(y)}h${num(w)}v${num(h)}h${num(-w)}z`;
  }
  const a = `a${num(r)} ${num(r)} 0 0 1`;
  return (
    `M${num(x + r)} ${num(y)}h${num(w - 2 * r)}${a} ${num(r)} ${num(r)}` +
    `v${num(h - 2 * r)}${a} ${num(-r)} ${num(r)}h${num(-(w - 2 * r))}` +
    `${a} ${num(-r)} ${num(-r)}v${num(-(h - 2 * r))}${a} ${num(r)} ${num(-r)}z`
  );
}

function circle(cx: number, cy: number, r: number): string {
  return (
    `M${num(cx - r)} ${num(cy)}a${num(r)} ${num(r)} 0 1 0 ${num(2 * r)} 0` +
    `a${num(r)} ${num(r)} 0 1 0 ${num(-2 * r)} 0z`
  );
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ความมนของ "ตา" 3 มุม (วงนอก, จุดใน) ตามรูปร่างที่เลือก
const EYE_RADIUS: Record<QrShape, [number, number]> = {
  square: [0, 0],
  rounded: [1.6, 0.8],
  dots: [2.4, 1.5],
};

export function renderStyledQr(text: string, style: QrStyle): string {
  const modules = create(text, { errorCorrectionLevel: 'M' }).modules;
  const size = modules.size;
  const side = size + QUIET_ZONE * 2;
  const border = style.frame ? 1.5 : 0;
  const band = style.frame ? 7 : 0;
  const width = side + border * 2;
  const height = side + border * 2 + band;
  const originX = border + QUIET_ZONE;
  const originY = border + QUIET_ZONE;
  const fg = `#${style.fg}`;
  const bg = `#${style.bg}`;

  const parts: string[] = [];
  if (style.frame) {
    parts.push(`<rect width="${num(width)}" height="${num(height)}" rx="3" fill="${fg}"/>`);
    parts.push(
      `<rect x="${num(border)}" y="${num(border)}" width="${side}" height="${side}" rx="2" fill="${bg}"/>`,
    );
    parts.push(
      `<text x="${num(width / 2)}" y="${num(side + border * 2 + band / 2)}" fill="${bg}" ` +
        `font-family="'Segoe UI', 'Noto Sans Thai', 'Leelawadee UI', Tahoma, sans-serif" ` +
        `font-size="3.4" font-weight="600" text-anchor="middle" dominant-baseline="central">` +
        `${escapeXml(style.label)}</text>`,
    );
  } else {
    parts.push(`<rect width="${num(width)}" height="${num(height)}" fill="${bg}"/>`);
  }

  // จุดข้อมูลทั้งหมด ยกเว้นบริเวณ "ตา" 3 มุมซึ่งวาดแยกด้านล่าง
  const inEye = (row: number, col: number) =>
    (row < 7 && col < 7) || (row < 7 && col >= size - 7) || (row >= size - 7 && col < 7);
  const dots: string[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!modules.get(row, col) || inEye(row, col)) {
        continue;
      }
      const x = originX + col;
      const y = originY + row;
      if (style.shape === 'dots') {
        dots.push(circle(x + 0.5, y + 0.5, 0.45));
      } else {
        dots.push(roundedRect(x, y, 1, 1, style.shape === 'rounded' ? 0.3 : 0));
      }
    }
  }
  parts.push(`<path fill="${fg}" d="${dots.join('')}"/>`);

  const [outer, inner] = EYE_RADIUS[style.shape];
  for (const [row, col] of [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ]) {
    const x = originX + col;
    const y = originY + row;
    const ring = roundedRect(x, y, 7, 7, outer) + roundedRect(x + 1, y + 1, 5, 5, Math.max(outer - 1, 0));
    parts.push(`<path fill="${fg}" fill-rule="evenodd" d="${ring}"/>`);
    parts.push(`<path fill="${fg}" d="${roundedRect(x + 2, y + 2, 3, 3, inner)}"/>`);
  }

  const scale = OUTPUT_WIDTH / side;
  const rendering = style.shape === 'square' ? 'crispEdges' : 'geometricPrecision';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${num(width)} ${num(height)}" ` +
    `width="${Math.round(width * scale)}" height="${Math.round(height * scale)}" ` +
    `shape-rendering="${rendering}">${parts.join('')}</svg>`
  );
}
