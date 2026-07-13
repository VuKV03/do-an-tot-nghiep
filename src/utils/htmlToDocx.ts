/**
 * Chuyển nội dung câu hỏi (HTML soạn từ RichTextEditor, hoặc text thuần cũ/AI sinh) thành
 * Paragraph[] của thư viện `docx`, giữ lại định dạng đậm/nghiêng/gạch chân/gạch ngang, cỡ chữ,
 * màu chữ, font chữ và ảnh chèn trực tiếp (base64) khi xuất file Word.
 */
import { Paragraph, TextRun, ImageRun, HeadingLevel, type ParagraphChild } from 'docx';
import { isLikelyHtml, sanitizeHtml } from './htmlContent';

interface RunStyle {
  bold?: boolean;
  italics?: boolean;
  underline?: {};
  strike?: boolean;
  color?: string;
  font?: string;
  size?: number; // half-points
}

/** Thang cỡ chữ 1-7 của execCommand('fontSize') quy đổi ra half-points (pt * 2) cho docx */
const LEGACY_FONT_SIZE_TO_HALF_PT: Record<string, number> = {
  '1': 16, // 8pt
  '2': 20, // 10pt
  '3': 24, // 12pt
  '4': 28, // 14pt
  '5': 36, // 18pt
  '6': 48, // 24pt
  '7': 68, // 34pt
};

function parseInlineStyleToRunStyle(styleAttr: string | null, style: RunStyle): RunStyle {
  if (!styleAttr) return style;
  const next = { ...style };
  const fontSizeMatch = /font-size\s*:\s*([\d.]+)px/i.exec(styleAttr);
  if (fontSizeMatch) {
    const px = parseFloat(fontSizeMatch[1]);
    next.size = Math.round((px * 0.75) * 2); // px -> pt (0.75) -> half-points
  }
  const colorMatch = /(?:^|;)\s*color\s*:\s*(#[0-9a-fA-F]{3,6}|rgb\([^)]+\))/i.exec(styleAttr);
  if (colorMatch) {
    next.color = colorMatch[1].startsWith('#') ? colorMatch[1].replace('#', '') : colorMatch[1];
  }
  if (/font-weight\s*:\s*(bold|[6-9]00)/i.test(styleAttr)) next.bold = true;
  if (/font-style\s*:\s*italic/i.test(styleAttr)) next.italics = true;
  if (/text-decoration[^;]*underline/i.test(styleAttr)) next.underline = {};
  if (/text-decoration[^;]*line-through/i.test(styleAttr)) next.strike = true;
  return next;
}

function clampImageSize(width: number, height: number): { width: number; height: number } {
  const MAX_WIDTH = 420;
  if (!width || !height) return { width: 300, height: 200 };
  if (width <= MAX_WIDTH) return { width, height };
  const ratio = MAX_WIDTH / width;
  return { width: MAX_WIDTH, height: Math.round(height * ratio) };
}

function detectImageType(src: string): 'png' | 'jpg' | 'gif' | 'bmp' {
  const m = /^data:image\/(png|jpe?g|gif|bmp)/i.exec(src);
  if (!m) return 'png';
  const ext = m[1].toLowerCase();
  if (ext === 'jpeg' || ext === 'jpg') return 'jpg';
  if (ext === 'gif') return 'gif';
  if (ext === 'bmp') return 'bmp';
  return 'png';
}

/** Xử lý một node đơn (text, ảnh, hoặc phần tử inline định dạng) thành các ParagraphChild tương ứng */
function collectRunsForNode(node: Node, style: RunStyle): ParagraphChild[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    if (!text) return [];
    return [new TextRun({
      text,
      bold: style.bold,
      italics: style.italics,
      underline: style.underline,
      strike: style.strike,
      color: style.color,
      font: style.font,
      size: style.size,
    })];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return [];

  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  if (tag === 'br') return [new TextRun({ text: '', break: 1 })];

  if (tag === 'img') {
    const src = el.getAttribute('src') || '';
    if (!src.startsWith('data:image/')) return [];
    const naturalWidth = parseInt(el.getAttribute('width') || '', 10) || 300;
    const naturalHeight = parseInt(el.getAttribute('height') || '', 10) || 200;
    const { width, height } = clampImageSize(naturalWidth, naturalHeight);
    return [new ImageRun({
      type: detectImageType(src),
      data: src,
      transformation: { width, height },
    } as any)];
  }

  let nextStyle = { ...style };
  if (tag === 'b' || tag === 'strong') nextStyle.bold = true;
  if (tag === 'i' || tag === 'em') nextStyle.italics = true;
  if (tag === 'u') nextStyle.underline = {};
  if (tag === 's' || tag === 'strike') nextStyle.strike = true;
  if (tag === 'font') {
    const size = el.getAttribute('size');
    const face = el.getAttribute('face');
    const color = el.getAttribute('color');
    if (size && LEGACY_FONT_SIZE_TO_HALF_PT[size]) nextStyle.size = LEGACY_FONT_SIZE_TO_HALF_PT[size];
    if (face) nextStyle.font = face;
    if (color) nextStyle.color = color.replace('#', '');
  }
  if (tag === 'span') {
    nextStyle = parseInlineStyleToRunStyle(el.getAttribute('style'), nextStyle);
  }

  return collectRuns(el, nextStyle);
}

function collectRuns(node: Node, style: RunStyle): ParagraphChild[] {
  const runs: ParagraphChild[] = [];
  node.childNodes.forEach((child) => {
    runs.push(...collectRunsForNode(child, style));
  });
  return runs;
}

const BLOCK_TAGS = ['P', 'DIV', 'H1', 'H2'];

function blockHeading(tagName: string): (typeof HeadingLevel)[keyof typeof HeadingLevel] | undefined {
  if (tagName === 'H1') return HeadingLevel.HEADING_1;
  if (tagName === 'H2') return HeadingLevel.HEADING_2;
  return undefined;
}

/**
 * Chuyển một đoạn nội dung câu hỏi (HTML hoặc text thuần) thành danh sách Paragraph để chèn vào docx.
 * `leadingRun` (ví dụ "Câu 1: " in đậm) sẽ được ghép vào đầu paragraph đầu tiên nếu có.
 */
export function htmlToDocxParagraphs(content: string | undefined, leadingRun?: TextRun): Paragraph[] {
  const value = content || '';

  if (!isLikelyHtml(value)) {
    const children: ParagraphChild[] = leadingRun ? [leadingRun, new TextRun({ text: value })] : [new TextRun({ text: value })];
    return [new Paragraph({ children })];
  }

  const clean = sanitizeHtml(value);
  const doc = new DOMParser().parseFromString(clean, 'text/html');

  const paragraphs: Paragraph[] = [];
  let bufferRuns: ParagraphChild[] = [];
  let leadingUsed = false;

  const takeLeading = (runs: ParagraphChild[]): ParagraphChild[] => {
    if (leadingUsed || !leadingRun) return runs;
    leadingUsed = true;
    return [leadingRun, ...runs];
  };

  const flushBuffer = () => {
    if (bufferRuns.length === 0) return;
    paragraphs.push(new Paragraph({ children: takeLeading(bufferRuns) }));
    bufferRuns = [];
  };

  // Đi qua TOÀN BỘ node con theo đúng thứ tự (không chỉ các thẻ block) — vì ảnh đính kèm được
  // đặt trần ở đầu nội dung (không bọc trong <div>/<p>), nếu chỉ lọc theo block sẽ bị bỏ sót.
  doc.body.childNodes.forEach((node) => {
    const isBlockElement = node.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.includes((node as Element).tagName);
    if (isBlockElement) {
      flushBuffer();
      const el = node as Element;
      const runs = collectRuns(el, {});
      paragraphs.push(new Paragraph({
        heading: blockHeading(el.tagName),
        children: takeLeading(runs.length ? runs : [new TextRun({ text: '' })]),
      }));
    } else {
      bufferRuns.push(...collectRunsForNode(node, {}));
    }
  });
  flushBuffer();

  if (paragraphs.length === 0) {
    return [new Paragraph({ children: leadingRun ? [leadingRun] : [] })];
  }
  return paragraphs;
}
