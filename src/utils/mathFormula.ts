import katex from 'katex';


export const FORMULA_CLASS = 'qh-formula';


export function renderLatexToHtml(latex: string): string {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      output: 'html',
      errorColor: 'inherit',
    });
  } catch {
    return `<span>${escapeHtml(latex)}</span>`;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


const ZWSP = String.fromCharCode(0x200b);


export function buildFormulaHtml(latex: string): string {
  const encoded = encodeURIComponent(latex);
  const rendered = renderLatexToHtml(latex);
  return `${ZWSP}<span class="${FORMULA_CLASS}" contenteditable="false" data-latex="${encoded}">${rendered}</span>${ZWSP}`;
}

/** Tìm phần tử công thức gần nhất bao quanh 1 node (vd: node được click) */
export function findFormulaElement(node: Node | null): HTMLElement | null {
  let el: Node | null = node;
  while (el) {
    if (el instanceof HTMLElement && el.classList.contains(FORMULA_CLASS)) return el;
    el = el.parentNode;
  }
  return null;
}

export function getFormulaLatex(el: HTMLElement): string {
  const raw = el.getAttribute('data-latex') || '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}


export function protectFormulas(html: string): { protectedHtml: string; store: Map<string, string> } {
  const store = new Map<string, string>();
  if (!html || !html.includes(FORMULA_CLASS)) return { protectedHtml: html, store };

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const nodes = Array.from(doc.querySelectorAll(`span.${FORMULA_CLASS}[data-latex]`));
  nodes.forEach((el, index) => {
    const token = `f${index}-${Math.random().toString(36).slice(2, 8)}`;
    store.set(token, el.outerHTML);
    const placeholder = doc.createElement('span');
    placeholder.setAttribute('data-ftoken', token);
    el.replaceWith(placeholder);
  });

  return { protectedHtml: doc.body.innerHTML, store };
}

/** Khôi phục lại HTML gốc của các công thức đã "bảo vệ" ở protectFormulas(), sau khi DOMPurify chạy xong. */
export function restoreFormulas(sanitizedHtml: string, store: Map<string, string>): string {
  if (store.size === 0) return sanitizedHtml;

  const doc = new DOMParser().parseFromString(sanitizedHtml, 'text/html');
  doc.querySelectorAll('[data-ftoken]').forEach((placeholder) => {
    const token = placeholder.getAttribute('data-ftoken');
    const originalHtml = token ? store.get(token) : undefined;
    if (!originalHtml) return;
    const tmp = doc.createElement('div');
    tmp.innerHTML = originalHtml;
    const original = tmp.firstElementChild;
    if (original) placeholder.replaceWith(original);
  });

  return doc.body.innerHTML;
}


const DELIMITED_FORMULA_PATTERN =
  /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|(\\begin\{([a-zA-Z*]+)\}[\s\S]*?\\end\{\5\})|\$([^$\n]+?)\$/g;

/** Dấu thanh tiếng Việt — 1 dòng văn bản tiếng Việt bình thường hầu như luôn chứa ít nhất 1 ký tự
 * này; mã LaTeX gốc thì gần như không bao giờ có, dùng để tránh nhận nhầm câu văn thành công thức. */
const VIETNAMESE_DIACRITIC_PATTERN =
  /[àáạảãăằắặẳẵâầấậẩẫèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃĂẰẮẶẲẴÂẦẤẬẨẪÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/;

/** Có lệnh LaTeX (\frac, \sqrt, \alpha, \left,...) */
const LATEX_COMMAND_PATTERN = /\\[a-zA-Z]+/;
/** Cú pháp mũ/chỉ số kiểu mã nguồn: x^2, a_{i},... */
const LATEX_SUPSUB_PATTERN = /[a-zA-Z0-9)\]}][\^_]\{?[a-zA-Z0-9\\]/;


function looksLikeRawLatex(segment: string): boolean {
  const trimmed = segment.trim();
  if (!trimmed) return false;
  if (VIETNAMESE_DIACRITIC_PATTERN.test(trimmed)) return false;
  return LATEX_COMMAND_PATTERN.test(trimmed) || LATEX_SUPSUB_PATTERN.test(trimmed);
}


function processPlainSegment(segment: string): string {
  return segment
    .split('\n')
    .map((line) => (looksLikeRawLatex(line) ? buildFormulaHtml(line.trim()) : escapeHtml(line)))
    .join('<br>');
}


export function buildPastedHtml(text: string): { html: string; hasFormula: boolean } {

  const trimmedWhole = text.trim();
  if (trimmedWhole && !/\$|\\\[|\\\(/.test(text) && looksLikeRawLatex(trimmedWhole)) {
    return { html: buildFormulaHtml(trimmedWhole), hasFormula: true };
  }

  DELIMITED_FORMULA_PATTERN.lastIndex = 0;
  let lastIndex = 0;
  let html = '';
  let match: RegExpExecArray | null;

  while ((match = DELIMITED_FORMULA_PATTERN.exec(text))) {
    if (match.index > lastIndex) {
      html += processPlainSegment(text.slice(lastIndex, match.index));
    }
    const latex = (match[1] ?? match[2] ?? match[3] ?? match[4] ?? match[6] ?? '').trim();
    if (latex) {
      html += buildFormulaHtml(latex);
    }
    lastIndex = DELIMITED_FORMULA_PATTERN.lastIndex;
  }
  if (lastIndex < text.length) {
    html += processPlainSegment(text.slice(lastIndex));
  }

  return { html, hasFormula: html.includes(FORMULA_CLASS) };
}


const INLINE_SUPSUB_PATTERN = /([a-zA-Z0-9]+|[)\]}])([\^_])(\{[^{}]*\}|-?[a-zA-Z0-9]+)/g;

function toLatexExpr(segment: string): string {
  return segment.replace(INLINE_SUPSUB_PATTERN, (_match, base: string, op: string, exp: string) => {
    const expContent = exp.startsWith('{') ? exp.slice(1, -1) : exp;
    return `${base}${op}{${expContent}}`;
  });
}


const FRACTION_SIDE = '\\([^()]+\\)|-?[a-zA-Zπ0-9]{1,3}';

const FRACTION_PATTERN = new RegExp(`(?<![\\d/])(${FRACTION_SIDE})/(${FRACTION_SIDE})(?![a-zA-Z0-9])(?!/\\d)`, 'g');

function stripParens(side: string): string {
  return side.startsWith('(') && side.endsWith(')') ? side.slice(1, -1).trim() : side;
}

export function convertAiPlainMathNotation(text: string): string {
  if (!text) return text;
  let result = text;
  if (result.includes('/')) {
    result = result.replace(FRACTION_PATTERN, (_match, num: string, den: string) => {
      const numerator = toLatexExpr(stripParens(num));
      const denominator = toLatexExpr(stripParens(den));
      return buildFormulaHtml(`\\frac{${numerator}}{${denominator}}`);
    });
  }
  if (/[\^_]/.test(result)) {
    result = result.replace(INLINE_SUPSUB_PATTERN, (_match, base: string, op: string, exp: string) => {
      const expContent = exp.startsWith('{') ? exp.slice(1, -1) : exp;
      return buildFormulaHtml(`${base}${op}{${expContent}}`);
    });
  }
  return result;
}

// Chuẩn hóa công thức hoặc ký hiệu toán học (a/b, a^2, x^2, ...)
export function convertAiQuestionMath<T extends {
  text?: string;
  options?: string[];
  correctAnswer?: string;
  statements?: { content: string }[];
}>(aiQ: T): T {
  const converted: any = { ...aiQ };
  if (typeof converted.text === 'string') converted.text = convertAiPlainMathNotation(converted.text);
  if (Array.isArray(converted.options)) {
    converted.options = converted.options.map((o: string) => convertAiPlainMathNotation(o));
  }
  if (typeof converted.correctAnswer === 'string') {
    converted.correctAnswer = convertAiPlainMathNotation(converted.correctAnswer);
  }
  if (Array.isArray(converted.statements)) {
    converted.statements = converted.statements.map((s: any) => ({ ...s, content: convertAiPlainMathNotation(s.content) }));
  }
  return converted;
}

/** Mẫu công thức thường dùng — chèn nhanh vào ô nhập LaTeX cho người chưa quen cú pháp */
export const FORMULA_TEMPLATES: { label: string; latex: string }[] = [
  { label: 'Phân số', latex: '\\frac{a}{b}' },
  { label: 'Căn bậc 2', latex: '\\sqrt{x}' },
  { label: 'Căn bậc n', latex: '\\sqrt[n]{x}' },
  { label: 'Số mũ', latex: 'x^{2}' },
  { label: 'Chỉ số dưới', latex: 'x_{i}' },
  { label: 'Tổng', latex: '\\sum_{i=1}^{n} x_i' },
  { label: 'Tích phân', latex: '\\int_{a}^{b} f(x)\\,dx' },
  { label: 'Giới hạn', latex: '\\lim_{x \\to \\infty} f(x)' },
  { label: 'Căn thức lớn', latex: '\\sqrt{\\frac{a}{b}}' },
  { label: 'Hệ phương trình', latex: '\\begin{cases} x + y = 1 \\\\ x - y = 2 \\end{cases}' },
  { label: 'Ma trận', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
  { label: 'Vector', latex: '\\vec{v}' },
];
