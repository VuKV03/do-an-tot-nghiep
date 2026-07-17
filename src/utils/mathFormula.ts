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
