import katex from 'katex';

/** Class đánh dấu 1 công thức LaTeX đã chèn vào nội dung câu hỏi (RichTextEditor) */
export const FORMULA_CLASS = 'qh-formula';

/** Render LaTeX → HTML (KaTeX). Không throw khi cú pháp sai — hiện lỗi dạng chữ đỏ thay vì crash cả ô soạn thảo. */
export function renderLatexToHtml(latex: string): string {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      output: 'html',
      errorColor: '#dc2626',
    });
  } catch {
    return `<span style="color:#dc2626">${escapeHtml(latex)}</span>`;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Dựng thẻ HTML cho 1 công thức để chèn vào editor: khối không-chỉnh-sửa-trực-tiếp (giống 1 "ký tự"
 * đặc biệt), giữ nguyên mã LaTeX gốc trong data-latex để có thể mở lại chỉnh sửa sau này. */
export function buildFormulaHtml(latex: string): string {
  const encoded = encodeURIComponent(latex);
  const rendered = renderLatexToHtml(latex);
  return `<span class="${FORMULA_CLASS}" contenteditable="false" data-latex="${encoded}">${rendered}</span>`;
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

/**
 * "Bảo vệ" các công thức KaTeX trước khi lọc HTML (DOMPurify) — cấu trúc HTML nội bộ của KaTeX
 * (nhiều lớp span/svg lồng nhau, thuộc tính class/style dày đặc) sẽ bị bộ lọc HTML thông thường của
 * dự án cắt trụi vì không nằm trong danh sách thẻ/thuộc tính cho phép. Vì nội dung này hoàn toàn do
 * chính hàm renderLatexToHtml() ở trên sinh ra (không phải HTML người dùng gõ/dán trực tiếp), nên có
 * thể tạm thay mỗi công thức bằng 1 thẻ span rỗng đơn giản, cho DOMPurify xử lý phần còn lại của nội
 * dung như bình thường, rồi khôi phục lại HTML gốc của công thức sau khi lọc xong.
 */
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

/** Nhận diện công thức LaTeX có dấu phân cách rõ ràng trong văn bản dán vào (copy từ ChatGPT, tài
 * liệu LaTeX, web...): `$$...$$`, `\[...\]` (khối), `\(...\)` (nội dòng), hoặc cả 1 môi trường
 * `\begin{...}...\end{...}` (ma trận, hệ phương trình...) dù không có dấu $ bao ngoài.
 * Cố ý KHÔNG nhận `$...$` đơn — dễ nhận nhầm với giá tiền kiểu "$5, $10" (đề bài toán tài chính)
 * thành công thức, gây lỗi ngoài ý muốn. */
const DELIMITED_FORMULA_PATTERN =
  /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|(\\begin\{([a-zA-Z*]+)\}[\s\S]*?\\end\{\5\})/g;

/** Dấu thanh tiếng Việt — 1 dòng văn bản tiếng Việt bình thường hầu như luôn chứa ít nhất 1 ký tự
 * này; mã LaTeX gốc thì gần như không bao giờ có, dùng để tránh nhận nhầm câu văn thành công thức. */
const VIETNAMESE_DIACRITIC_PATTERN =
  /[àáạảãăằắặẳẵâầấậẩẫèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃĂẰẮẶẲẴÂẦẤẬẨẪÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/;

/** Có lệnh LaTeX (\frac, \sqrt, \alpha, \left,...) */
const LATEX_COMMAND_PATTERN = /\\[a-zA-Z]+/;
/** Cú pháp mũ/chỉ số kiểu mã nguồn: x^2, a_{i},... */
const LATEX_SUPSUB_PATTERN = /[a-zA-Z0-9)\]}][\^_]\{?[a-zA-Z0-9\\]/;

/** 1 dòng "trông giống" mã LaTeX gốc chưa có dấu phân cách — không dấu tiếng Việt, có lệnh LaTeX
 * hoặc cú pháp mũ/chỉ số. Dùng để tự convert cả khi người dùng dán thẳng công thức không bọc $...$. */
function looksLikeRawLatex(segment: string): boolean {
  const trimmed = segment.trim();
  if (!trimmed) return false;
  if (VIETNAMESE_DIACRITIC_PATTERN.test(trimmed)) return false;
  return LATEX_COMMAND_PATTERN.test(trimmed) || LATEX_SUPSUB_PATTERN.test(trimmed);
}

/** Xử lý phần văn bản NẰM NGOÀI các khối có dấu phân cách — vẫn dò từng dòng xem có phải mã LaTeX
 * trần (không dấu $/\[.../\]) hay không, còn lại giữ nguyên dạng chữ thường. */
function processPlainSegment(segment: string): string {
  return segment
    .split('\n')
    .map((line) => (looksLikeRawLatex(line) ? buildFormulaHtml(line.trim()) : escapeHtml(line)))
    .join('<br>');
}

/** Chuyển văn bản thuần dán vào thành HTML: đoạn nhận diện là LaTeX (có dấu phân cách hoặc trông
 * giống mã nguồn LaTeX trần) được render thành công thức toán học ngay, phần còn lại giữ nguyên
 * dạng chữ (đã escape để không lọt HTML lạ, giữ xuống dòng bằng <br>). */
export function buildPastedHtml(text: string): { html: string; hasFormula: boolean } {
  DELIMITED_FORMULA_PATTERN.lastIndex = 0;
  let lastIndex = 0;
  let html = '';
  let match: RegExpExecArray | null;

  while ((match = DELIMITED_FORMULA_PATTERN.exec(text))) {
    if (match.index > lastIndex) {
      html += processPlainSegment(text.slice(lastIndex, match.index));
    }
    const latex = (match[1] ?? match[2] ?? match[3] ?? match[4] ?? '').trim();
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
