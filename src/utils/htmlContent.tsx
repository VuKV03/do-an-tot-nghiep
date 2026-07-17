import React from 'react';
import DOMPurify from 'dompurify';
import { Image } from 'antd';
import parse, { Element as ParserElement, type HTMLReactParserOptions } from 'html-react-parser';
import 'katex/dist/katex.min.css';
import { protectFormulas, restoreFormulas, getFormulaLatex, FORMULA_CLASS } from './mathFormula';

/** Kích thước thumbnail hiển thị — bấm vào để xem ảnh gốc đầy đủ độ phân giải (giống xem ảnh trong chat) */
const VIEW_THUMB_WIDTH = 140;

/** Các thẻ/thuộc tính được phép trong nội dung câu hỏi soạn từ RichTextEditor */
const ALLOWED_TAGS = ['b', 'strong', 'i', 'em', 'u', 's', 'strike', 'span', 'font', 'p', 'div', 'br', 'h1', 'h2', 'img', 'a', 'table', 'thead', 'tbody', 'tr', 'td', 'th'];
const ALLOWED_ATTR = ['style', 'src', 'alt', 'width', 'height', 'href', 'target', 'rel', 'face', 'size', 'color', 'data-ftoken'];

/** Nhận diện một chuỗi có phải HTML (do RichTextEditor sinh ra) hay chỉ là text thuần (vd: AI sinh, dữ liệu cũ) */
export function isLikelyHtml(value: string | undefined | null): boolean {
  if (!value) return false;
  return /<[a-z][\s\S]*>/i.test(value);
}

/** Lọc sạch HTML trước khi lưu xuống DB hoặc render bằng dangerouslySetInnerHTML, chống XSS.
 * Công thức LaTeX (KaTeX) được bảo vệ tạm thời trước khi lọc rồi khôi phục lại sau — xem protectFormulas(). */
export function sanitizeHtml(html: string | undefined | null): string {
  if (!html) return '';
  const { protectedHtml, store } = protectFormulas(html);
  const sanitized = DOMPurify.sanitize(protectedHtml, { ALLOWED_TAGS, ALLOWED_ATTR });
  return restoreFormulas(sanitized, store);
}

/** Bóc toàn bộ tag HTML, chỉ giữ lại text thuần — dùng cho tìm kiếm theo từ khóa và các đoạn preview cắt ngắn */
export function stripHtmlToText(value: string | undefined | null): string {
  if (!value) return '';
  if (!isLikelyHtml(value)) return value;
  const doc = new DOMParser().parseFromString(value, 'text/html');
  // Bỏ hẳn bảng — bảng danh sách/tìm kiếm chỉ cần xem nội dung câu hỏi (đoạn văn), không cần
  // hiện nội dung từng ô bảng chèn thêm.
  doc.querySelectorAll('table').forEach((table) => table.remove());
  // Thay công thức KaTeX (nhiều span/svg lồng nhau) bằng mã LaTeX gốc — để tìm kiếm theo từ khóa
  // và đoạn preview vẫn đọc được ý nghĩa công thức thay vì ký tự rời rạc từ cấu trúc render.
  doc.querySelectorAll(`.${FORMULA_CLASS}`).forEach((el) => {
    el.textContent = getFormulaLatex(el as HTMLElement);
  });
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

const parserOptions: HTMLReactParserOptions = {
  replace: (domNode) => {
    if (domNode instanceof ParserElement && domNode.name === 'img') {
      const src = domNode.attribs?.src;
      if (!src) return undefined;
      return (
        <Image
          src={src}
          width={VIEW_THUMB_WIDTH}
          style={{
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            objectFit: 'cover',
            margin: 2,
            cursor: 'zoom-in',
          }}
        />
      );
    }
    return undefined;
  },
};

/**
 * Hiển thị nội dung câu hỏi: nếu là HTML (soạn từ RichTextEditor) thì render đúng định dạng
 * (đậm/nghiêng/cỡ chữ...) đã được lọc sạch, ảnh hiển thị dạng thumbnail nhỏ và bấm vào để xem
 * ảnh gốc đầy đủ độ phân giải (giống xem ảnh đính kèm trong chat) — nếu có nhiều ảnh, có thể
 * lướt qua lại giữa các ảnh ngay trong khung xem full. Nếu là text thuần (dữ liệu cũ, AI sinh)
 * thì hiển thị nguyên văn, giữ xuống dòng.
 */
export function RichTextView({ html, className }: { html: string | undefined | null; className?: string }) {
  if (!html) return null;
  if (isLikelyHtml(html)) {
    const clean = sanitizeHtml(html);
    return (
      <div className={className} style={{ whiteSpace: 'normal' }}>
        <Image.PreviewGroup>{parse(clean, parserOptions)}</Image.PreviewGroup>
      </div>
    );
  }
  return <div className={className} style={{ whiteSpace: 'pre-wrap' }}>{html}</div>;
}
