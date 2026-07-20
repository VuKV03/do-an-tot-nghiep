import React, { useEffect, useRef, useState } from 'react';
import { message, Image } from 'antd';
import 'katex/dist/katex.min.css';
import { isLikelyHtml, sanitizeHtml } from '../utils/htmlContent';
import { compressImageFile } from '../utils/imageCompress';
import {
  buildPastedHtml,
  findFormulaElement,
  getFormulaLatex,
  renderLatexToHtml,
  FORMULA_TEMPLATES,
} from '../utils/mathFormula';

/** Kích thước thumbnail hiển thị trong dải ảnh đính kèm — ảnh gốc đầy đủ độ phân giải chỉ hiện khi bấm zoom */
const ATTACHMENT_THUMB_SIZE = 64;

export interface RichTextEditorProps {
  /** Optional vì AntD `Form.Item` tự inject value/onChange lúc runtime qua cloneElement */
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
}

interface Attachment {
  id: string;
  src: string;
  width: number;
  height: number;
}

/** Chỉ chặn những tệp bất thường lớn (ảnh gốc sẽ luôn được tự resize + nén trước khi nhúng) */
const MAX_ORIGINAL_FILE_BYTES = 25 * 1024 * 1024;

const FONT_FAMILY_OPTIONS = [
  { label: 'Mặc định', value: '' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
];

const FONT_SIZE_OPTIONS = [
  { label: 'Nhỏ', value: '2' },
  { label: 'Vừa', value: '3' },
  { label: 'Lớn', value: '5' },
  { label: 'Rất lớn', value: '7' },
];

const TABLE_CELL_STYLE = 'border:1px solid #cbd5e1;padding:6px 8px;min-width:48px;';
const TABLE_PICKER_MAX_ROWS = 8;
const TABLE_PICKER_MAX_COLS = 10;

/** Sinh HTML cho một bảng rows×cols, mỗi ô có viền + đệm sẵn giống bảng trong Word */
function buildTableHtml(rows: number, cols: number): string {
  const row = `<tr>${Array.from({ length: cols }, () => `<td style="${TABLE_CELL_STYLE}"><br></td>`).join('')}</tr>`;
  const body = Array.from({ length: rows }, () => row).join('');
  return `<table style="border-collapse:collapse;margin:8px 0;">${body}</table><p><br></p>`;
}

/** Ký tự đặc biệt / toán học thường dùng khi soạn câu hỏi thi — chèn dạng text thuần, hiển thị bình thường ở mọi nơi */
const SPECIAL_CHAR_GROUPS: { label: string; chars: string[] }[] = [
  { label: 'Toán học', chars: ['±', '×', '÷', '≠', '≈', '≡', '≤', '≥', '∞', '√', '∛', '∑', '∏', '∫', '∂', '∇', '°', '′', '″', '‰', '%'] },
  { label: 'Số mũ / phân số', chars: ['²', '³', 'ⁿ', '½', '⅓', '⅔', '¼', '¾', '⅕', '⅛'] },
  { label: 'Chữ Hy Lạp', chars: ['α', 'β', 'γ', 'δ', 'ε', 'θ', 'λ', 'μ', 'π', 'ρ', 'σ', 'φ', 'ω', 'Δ', 'Σ', 'Φ', 'Ω', 'Π'] },
  { label: 'Tập hợp / logic', chars: ['∈', '∉', '⊂', '⊆', '⊄', '∪', '∩', '∅', '∀', '∃', '¬', '∧', '∨', '⇒', '⇔'] },
  { label: 'Mũi tên', chars: ['→', '←', '↔', '↑', '↓', '⇌'] },
  { label: 'Khác', chars: ['•', '§', '¶', '©', '®', '™', '…', '–', '—', '№'] },
];

/** Tách các <img> ra khỏi HTML thành danh sách "đính kèm" riêng, phần còn lại là nội dung text thuần túy */
function splitHtmlIntoAttachmentsAndText(html: string): { attachments: Attachment[]; textHtml: string } {
  if (!html || !isLikelyHtml(html)) return { attachments: [], textHtml: html || '' };
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const imgs = Array.from(doc.body.querySelectorAll('img'));
  const attachments: Attachment[] = imgs.map((img, idx) => ({
    id: `att-${Date.now()}-${idx}`,
    src: img.getAttribute('src') || '',
    width: parseInt(img.getAttribute('width') || '', 10) || 300,
    height: parseInt(img.getAttribute('height') || '', 10) || 200,
  }));
  imgs.forEach((img) => img.remove());
  return { attachments, textHtml: doc.body.innerHTML };
}

const buildImgTag = (a: Attachment) => `<img src="${a.src}" width="${a.width}" height="${a.height}" />`;

export default function RichTextEditor({ value, onChange, placeholder, minHeight = 100, className }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isFocusedRef = useRef(false);
  /** Bỏ qua 1 lần emitChange() ở onBlur kế tiếp — dùng khi việc "rời focus" là do tự mở popup nội bộ
   * (vd: ô nhập công thức LaTeX autoFocus) chứ không phải người dùng thật sự rời khỏi trường, tránh
   * validate "required" chớp đỏ oan uổng lúc ô soạn thảo đang trống. */
  const suppressNextBlurEmitRef = useRef(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [hoverCell, setHoverCell] = useState({ rows: 0, cols: 0 });
  const [isInTable, setIsInTable] = useState(false);
  const [showSymbolPicker, setShowSymbolPicker] = useState(false);
  const [showFormulaPicker, setShowFormulaPicker] = useState(false);
  const [formulaLatex, setFormulaLatex] = useState('');
  const editingFormulaElRef = useRef<HTMLElement | null>(null);
  const savedSelectionRef = useRef<Range | null>(null);

  // Đồng bộ giá trị từ ngoài vào (vd: reset form, tải dữ liệu để sửa) — tách ảnh đính kèm ra khỏi
  // phần text, chỉ khi editor không đang được focus để tránh nhảy con trỏ giữa lúc gõ.
  useEffect(() => {
    if (isFocusedRef.current) return;
    const { attachments: parsedAttachments, textHtml } = splitHtmlIntoAttachmentsAndText(value || '');
    setAttachments(parsedAttachments);
    if (editorRef.current && editorRef.current.innerHTML !== textHtml) {
      editorRef.current.innerHTML = textHtml;
    }
  }, [value]);

  const emitChange = (attachmentsOverride?: Attachment[]) => {
    const atts = attachmentsOverride ?? attachments;
    const textHtml = editorRef.current ? editorRef.current.innerHTML : '';
    const combined = atts.map(buildImgTag).join('') + textHtml;
    onChange?.(sanitizeHtml(combined));
  };

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const exec = (command: string, arg?: string) => {
    focusEditor();
    document.execCommand(command, false, arg);
    emitChange();
  };

  const handleInsertImageClick = () => fileInputRef.current?.click();

  const removeAttachment = (id: string) => {
    const next = attachments.filter((a) => a.id !== id);
    setAttachments(next);
    emitChange(next);
  };

  /** Tìm ô <td>/<th> đang chứa con trỏ/selection hiện tại, nếu có */
  const getCellAtSelection = (): HTMLTableCellElement | null => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editorRef.current) return null;
    const range = sel.getRangeAt(0);
    let node: Node | null = range.startContainer;

    // Click vào ô trống (chỉ có <br>, chưa gõ gì) đôi khi khiến trình duyệt xác định selection
    // rơi vào <table>/<tbody>/<tr> thay vì đúng <td> bên trong — suy ra ô cụ thể theo offset.
    if (node instanceof HTMLElement && ['TABLE', 'TBODY', 'THEAD', 'TR'].includes(node.tagName)) {
      const child = node.childNodes[range.startOffset] || node.childNodes[range.startOffset - 1] || node.childNodes[0];
      if (child) node = child;
    }

    while (node && node !== editorRef.current) {
      if (node instanceof HTMLElement && (node.tagName === 'TD' || node.tagName === 'TH')) {
        return node as HTMLTableCellElement;
      }
      if (node instanceof HTMLElement && node.tagName === 'TR') {
        return (node as HTMLTableRowElement).cells[0] || null;
      }
      node = node.parentNode;
    }
    return null;
  };

  const updateTableContext = () => setIsInTable(!!getCellAtSelection());

  const insertTable = (rows: number, cols: number) => {
    focusEditor();
    document.execCommand('insertHTML', false, buildTableHtml(rows, cols));
    emitChange();
    setShowTablePicker(false);
    setHoverCell({ rows: 0, cols: 0 });
    setIsInTable(false);
  };

  const withActiveCell = (mutate: (cell: HTMLTableCellElement) => void) => {
    const cell = getCellAtSelection();
    if (!cell) return;
    mutate(cell);
    emitChange();
    updateTableContext();
  };

  const insertTableRow = (position: 'above' | 'below') => withActiveCell((cell) => {
    const row = cell.parentElement as HTMLTableRowElement;
    const newRow = row.cloneNode(true) as HTMLTableRowElement;
    Array.from(newRow.cells).forEach((c) => { c.innerHTML = '<br>'; });
    if (position === 'above') row.parentElement!.insertBefore(newRow, row);
    else row.parentElement!.insertBefore(newRow, row.nextSibling);
  });

  const insertTableColumn = (position: 'left' | 'right') => withActiveCell((cell) => {
    const table = cell.closest('table');
    if (!table) return;
    const cellIndex = cell.cellIndex;
    Array.from(table.rows).forEach((r) => {
      const refCell = r.cells[cellIndex];
      if (!refCell) return;
      const newCell = refCell.cloneNode(false) as HTMLTableCellElement;
      newCell.innerHTML = '<br>';
      if (position === 'left') r.insertBefore(newCell, refCell);
      else r.insertBefore(newCell, refCell.nextSibling);
    });
  });

  const deleteTableRow = () => withActiveCell((cell) => {
    const table = cell.closest('table');
    const row = cell.parentElement as HTMLTableRowElement;
    if (!table) return;
    if (table.rows.length <= 1) { table.remove(); return; }
    row.remove();
  });

  const deleteTableColumn = () => withActiveCell((cell) => {
    const table = cell.closest('table');
    if (!table) return;
    const cellIndex = cell.cellIndex;
    if (table.rows[0].cells.length <= 1) { table.remove(); return; }
    Array.from(table.rows).forEach((r) => { r.cells[cellIndex]?.remove(); });
  });

  const deleteTableAtCursor = () => withActiveCell((cell) => {
    cell.closest('table')?.remove();
  });

  /** Tab để nhảy sang ô kế tiếp/trước, ở ô cuối cùng thì tự thêm dòng mới — giống Word */
  const handleTableTabKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const cell = getCellAtSelection();
    if (!cell) return;
    e.preventDefault();
    const row = cell.parentElement as HTMLTableRowElement;
    const cellIndex = cell.cellIndex;
    let targetCell: HTMLTableCellElement | null = null;

    if (!e.shiftKey) {
      targetCell = row.cells[cellIndex + 1] || null;
      if (!targetCell) {
        const nextRow = row.nextElementSibling as HTMLTableRowElement | null;
        if (nextRow) {
          targetCell = nextRow.cells[0] || null;
        } else {
          insertTableRow('below');
          const newRow = row.nextElementSibling as HTMLTableRowElement | null;
          targetCell = newRow ? newRow.cells[0] : null;
        }
      }
    } else {
      targetCell = row.cells[cellIndex - 1] || null;
      if (!targetCell) {
        const prevRow = row.previousElementSibling as HTMLTableRowElement | null;
        if (prevRow) targetCell = prevRow.cells[prevRow.cells.length - 1] || null;
      }
    }

    if (targetCell) {
      const range = document.createRange();
      range.selectNodeContents(targetCell);
      range.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      updateTableContext();
    }
  };

  const addImageFiles = async (files: File[]) => {
    if (files.length === 0) return;

    const invalid = files.find((f) => !f.type.startsWith('image/'));
    if (invalid) {
      message.error('Vui lòng chỉ chọn các tệp ảnh (PNG/JPG/GIF).');
      return;
    }
    const tooBig = files.find((f) => f.size > MAX_ORIGINAL_FILE_BYTES);
    if (tooBig) {
      message.error(`Ảnh "${tooBig.name}" quá lớn (${Math.round(tooBig.size / 1024 / 1024)}MB). Vui lòng chọn ảnh dưới 25MB.`);
      return;
    }

    setIsProcessingImage(true);
    try {
      // Tự động resize + nén ảnh — giáo viên có thể tải thẳng ảnh chụp/screenshot gốc, không cần
      // tự chỉnh sửa kích thước trước. Ảnh được đưa vào dải "đính kèm" riêng phía trên, tách biệt
      // khỏi nội dung câu hỏi (giống đính kèm ảnh khi chat), không chèn xen vào giữa dòng chữ.
      const newAttachments: Attachment[] = [];
      for (const file of files) {
        const { dataUrl, width, height } = await compressImageFile(file);
        newAttachments.push({ id: `att-${Date.now()}-${Math.random().toString(36).slice(2)}`, src: dataUrl, width, height });
      }
      const next = [...attachments, ...newAttachments];
      setAttachments(next);
      emitChange(next);
    } catch (err: any) {
      message.error(err?.message || 'Không thể xử lý ảnh này. Vui lòng thử ảnh khác.');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    await addImageFiles(files);
  };

  const handleInsertLink = () => {
    const url = window.prompt('Nhập đường dẫn (URL):', 'https://');
    if (!url) return;
    exec('createLink', url);
  };

  /** Chèn ký tự đặc biệt/toán học dạng text thuần tại vị trí con trỏ — không đóng popup để chèn liên tiếp nhiều ký tự */
  const insertSymbol = (char: string) => {
    focusEditor();
    document.execCommand('insertText', false, char);
    emitChange();
  };

  /** Ghi nhớ vị trí con trỏ trong editor trước khi mở popup công thức (bấm vào ô nhập LaTeX làm mất focus editor) */
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    const range = savedSelectionRef.current;
    if (!range) return;
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  const openFormulaPickerForNew = () => {
    saveSelection();
    suppressNextBlurEmitRef.current = true;
    editingFormulaElRef.current = null;
    setFormulaLatex('');
    setShowFormulaPicker(true);
  };

  const openFormulaPickerForEdit = (el: HTMLElement) => {
    suppressNextBlurEmitRef.current = true;
    editingFormulaElRef.current = el;
    setFormulaLatex(getFormulaLatex(el));
    setShowFormulaPicker(true);
  };

  const closeFormulaPicker = () => {
    setShowFormulaPicker(false);
    setFormulaLatex('');
    editingFormulaElRef.current = null;
  };

  /** Click vào 1 công thức đã chèn (khối contenteditable=false) để mở lại và chỉnh sửa */
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const formulaEl = findFormulaElement(e.target as Node);
    if (formulaEl) openFormulaPickerForEdit(formulaEl);
  };

  const confirmFormula = () => {
    const latex = formulaLatex.trim();
    if (!latex) {
      closeFormulaPicker();
      return;
    }

    // Dùng chung logic tách công thức với luồng dán (paste): nếu người dùng gõ/dán nguyên cả câu
    // lẫn công thức (vd: "Đặt $Q(x)=P(x)-a.$ Suy ra") thay vì chỉ riêng mã LaTeX, tự tách đúng phần
    // nào là chữ thường, phần nào là công thức — thay vì nhồi cả câu vào làm 1 công thức rồi lỗi.
    const { html } = buildPastedHtml(latex);

    const editingEl = editingFormulaElRef.current;
    if (editingEl) {
      editingEl.insertAdjacentHTML('beforebegin', html);
      editingEl.remove();
    } else {
      focusEditor();
      restoreSelection();
      document.execCommand('insertHTML', false, `${html}&nbsp;`);
    }
    emitChange();
    closeFormulaPicker();
  };

  const formulaPreviewHtml = formulaLatex.trim() ? renderLatexToHtml(formulaLatex) : '';

  const btnClass = 'px-1.5 py-0.5 text-[12px] font-bold text-slate-600 hover:bg-slate-200 rounded transition-colors';

  return (
    <div className={`border border-slate-300 rounded-lg ${className || ''}`}>
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 border-b border-slate-200 bg-slate-50 rounded-t-lg">
        <button type="button" className={btnClass} style={{ cursor: 'pointer' }} onMouseDown={(e) => e.preventDefault()} onClick={() => exec('formatBlock', '<h1>')}>H1</button>
        <button type="button" className={btnClass} style={{ cursor: 'pointer' }} onMouseDown={(e) => e.preventDefault()} onClick={() => exec('formatBlock', '<h2>')}>H2</button>
        <button type="button" className={btnClass} style={{ cursor: 'pointer' }} onMouseDown={(e) => e.preventDefault()} onClick={() => exec('formatBlock', '<p>')}>Normal</button>
        <span className="w-px h-4 bg-slate-300 mx-1" />
        <select
          className="text-[12px] text-slate-600 border-0 bg-transparent outline-none cursor-pointer font-medium"
          defaultValue=""
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => { if (e.target.value) exec('fontName', e.target.value); e.target.value = ''; }}
        >
          <option value="" disabled>Font chữ</option>
          {FONT_FAMILY_OPTIONS.filter((f) => f.value).map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <select
          className="text-[12px] text-slate-600 border-0 bg-transparent outline-none cursor-pointer font-medium"
          defaultValue=""
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => { if (e.target.value) exec('fontSize', e.target.value); e.target.value = ''; }}
        >
          <option value="" disabled>Cỡ chữ</option>
          {FONT_SIZE_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <span className="w-px h-4 bg-slate-300 mx-1" />
        <button type="button" className={`${btnClass} font-black`} style={{ cursor: 'pointer' }} onMouseDown={(e) => e.preventDefault()} onClick={() => exec('bold')}>B</button>
        <button type="button" className={`${btnClass} italic`} style={{ cursor: 'pointer' }} onMouseDown={(e) => e.preventDefault()} onClick={() => exec('italic')}>I</button>
        <button type="button" className={`${btnClass} underline`} style={{ cursor: 'pointer' }} onMouseDown={(e) => e.preventDefault()} onClick={() => exec('underline')}>U</button>
        <button type="button" className={`${btnClass} line-through`} style={{ cursor: 'pointer' }} onMouseDown={(e) => e.preventDefault()} onClick={() => exec('strikeThrough')}>S</button>
        <span className="w-px h-4 bg-slate-300 mx-1" />
        <button type="button" className={btnClass} style={{ cursor: 'pointer' }} title="Chèn liên kết" onMouseDown={(e) => e.preventDefault()} onClick={handleInsertLink}>🔗</button>
        <button
          type="button"
          className={btnClass}
          style={{ cursor: isProcessingImage ? 'wait' : 'pointer' }}
          title="Chèn ảnh (tự động thu nhỏ, không cần chỉnh sửa trước)"
          disabled={isProcessingImage}
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleInsertImageClick}
        >
          {isProcessingImage ? '⏳' : '🖼'}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileSelected} />
        <span className="w-px h-4 bg-slate-300 mx-1" />
        <div className="relative">
          <button
            type="button"
            className={btnClass}
            style={{ cursor: 'pointer' }}
            title="Chèn bảng"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowTablePicker((v) => !v)}
          >
            ▦
          </button>
          {showTablePicker && (
            <div
              className="absolute z-20 top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-2"
              onMouseDown={(e) => e.preventDefault()}
            >
              <div
                className="grid gap-0.5"
                style={{ gridTemplateColumns: `repeat(${TABLE_PICKER_MAX_COLS}, 16px)` }}
              >
                {Array.from({ length: TABLE_PICKER_MAX_ROWS * TABLE_PICKER_MAX_COLS }).map((_, idx) => {
                  const r = Math.floor(idx / TABLE_PICKER_MAX_COLS) + 1;
                  const c = (idx % TABLE_PICKER_MAX_COLS) + 1;
                  const active = r <= hoverCell.rows && c <= hoverCell.cols;
                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoverCell({ rows: r, cols: c })}
                      onClick={() => insertTable(r, c)}
                      style={{
                        width: 16,
                        height: 16,
                        border: '1px solid #cbd5e1',
                        background: active ? '#3b82f6' : '#f8fafc',
                        cursor: 'pointer',
                      }}
                    />
                  );
                })}
              </div>
              <div className="text-[11px] text-slate-500 text-center mt-1 font-medium">
                {hoverCell.rows > 0 ? `${hoverCell.rows} × ${hoverCell.cols}` : 'Chọn số dòng × cột'}
              </div>
            </div>
          )}
        </div>
        <span className="w-px h-4 bg-slate-300 mx-1" />
        <div className="relative">
          <button
            type="button"
            className={btnClass}
            style={{ cursor: 'pointer' }}
            title="Chèn công thức LaTeX (ký hiệu toán học không có sẵn)"
            onMouseDown={(e) => e.preventDefault()}
            onClick={openFormulaPickerForNew}
          >
            𝑓(x)
          </button>
          {showFormulaPicker && (
            <div
              className="absolute z-30 top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-3 w-[360px]"
              onMouseDown={(e) => e.preventDefault()}
            >
              <div className="text-[12px] font-semibold text-slate-700 mb-1.5">
                {editingFormulaElRef.current ? 'Sửa công thức LaTeX' : 'Nhập công thức LaTeX'}
              </div>
              <textarea
                autoFocus
                rows={3}
                className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-[13px] font-mono outline-none focus:border-blue-500"
                placeholder="Ví dụ: \frac{a}{b} + \sqrt{x}"
                value={formulaLatex}
                onChange={(e) => setFormulaLatex(e.target.value)}
              />
              <div className="mt-1.5 flex flex-wrap gap-1">
                {FORMULA_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.label}
                    type="button"
                    className="px-1.5 py-0.5 text-[11px] rounded border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-300"
                    style={{ cursor: 'pointer' }}
                    title={tpl.latex}
                    onClick={() => setFormulaLatex((prev) => (prev ? `${prev} ${tpl.latex}` : tpl.latex))}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
              <div className="mt-2 border border-slate-200 rounded-md px-2 py-2 min-h-[42px] bg-slate-50 flex items-center overflow-x-auto">
                {formulaPreviewHtml ? (
                  <span dangerouslySetInnerHTML={{ __html: formulaPreviewHtml }} />
                ) : (
                  <span className="text-[12px] text-slate-400">Xem trước công thức tại đây</span>
                )}
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  className="px-3 py-1 text-[12px] rounded border border-slate-300 text-slate-600 hover:bg-slate-100"
                  style={{ cursor: 'pointer' }}
                  onClick={closeFormulaPicker}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="px-3 py-1 text-[12px] rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ cursor: 'pointer' }}
                  disabled={!formulaLatex.trim()}
                  onClick={confirmFormula}
                >
                  {editingFormulaElRef.current ? 'Cập nhật' : 'Chèn'}
                </button>
              </div>
            </div>
          )}
        </div>
        <span className="w-px h-4 bg-slate-300 mx-1" />
        <div className="relative">
          <button
            type="button"
            className={btnClass}
            style={{ cursor: 'pointer' }}
            title="Chèn ký tự đặc biệt / toán học"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowSymbolPicker((v) => !v)}
          >
            Ω
          </button>
          {showSymbolPicker && (
            <div
              className="absolute z-20 top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-2 w-72 max-h-72 overflow-y-auto"
              onMouseDown={(e) => e.preventDefault()}
            >
              {SPECIAL_CHAR_GROUPS.map((group) => (
                <div key={group.label} className="mb-2 last:mb-0">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">{group.label}</div>
                  <div className="flex flex-wrap gap-1">
                    {group.chars.map((char) => (
                      <button
                        key={char}
                        type="button"
                        onClick={() => insertSymbol(char)}
                        className="w-7 h-7 flex items-center justify-center text-[15px] rounded border border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 text-slate-700"
                        style={{ cursor: 'pointer' }}
                        title={char}
                      >
                        {char}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <span className="w-px h-4 bg-slate-300 mx-1" />
        <button type="button" className={btnClass} style={{ cursor: 'pointer' }} title="Xoá định dạng" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('removeFormat')}>Tx</button>
      </div>

      {isInTable && (
        <div className="flex flex-wrap items-center gap-1 px-2 py-1 border-b border-slate-200 bg-indigo-50">
          <span className="text-[11px] font-bold text-indigo-700 mr-1">Bảng:</span>
          <button type="button" className={btnClass} style={{ cursor: 'pointer' }} onMouseDown={(e) => e.preventDefault()} onClick={() => insertTableRow('above')}>+ Dòng trên</button>
          <button type="button" className={btnClass} style={{ cursor: 'pointer' }} onMouseDown={(e) => e.preventDefault()} onClick={() => insertTableRow('below')}>+ Dòng dưới</button>
          <button type="button" className={btnClass} style={{ cursor: 'pointer' }} onMouseDown={(e) => e.preventDefault()} onClick={() => insertTableColumn('left')}>+ Cột trái</button>
          <button type="button" className={btnClass} style={{ cursor: 'pointer' }} onMouseDown={(e) => e.preventDefault()} onClick={() => insertTableColumn('right')}>+ Cột phải</button>
          <span className="w-px h-4 bg-indigo-200 mx-1" />
          <button type="button" className={`${btnClass} text-rose-600`} style={{ cursor: 'pointer' }} onMouseDown={(e) => e.preventDefault()} onClick={deleteTableRow}>− Dòng</button>
          <button type="button" className={`${btnClass} text-rose-600`} style={{ cursor: 'pointer' }} onMouseDown={(e) => e.preventDefault()} onClick={deleteTableColumn}>− Cột</button>
          <button type="button" className={`${btnClass} text-rose-600`} style={{ cursor: 'pointer' }} onMouseDown={(e) => e.preventDefault()} onClick={deleteTableAtCursor}>Xoá bảng</button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-2 pt-2.5 pb-1.5 border-b border-slate-200 bg-white">
          <Image.PreviewGroup>
            {attachments.map((a) => (
              <div key={a.id} className="relative" style={{ width: ATTACHMENT_THUMB_SIZE, height: ATTACHMENT_THUMB_SIZE }}>
                <Image
                  src={a.src}
                  width={ATTACHMENT_THUMB_SIZE}
                  height={ATTACHMENT_THUMB_SIZE}
                  style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #cbd5e1', cursor: 'zoom-in' }}
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeAttachment(a.id); }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-800 text-white text-[12px] leading-none flex items-center justify-center hover:bg-red-600 shadow"
                  style={{ cursor: 'pointer', zIndex: 2 }}
                  title="Xoá ảnh này"
                >
                  ×
                </button>
              </div>
            ))}
          </Image.PreviewGroup>
        </div>
      )}

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className="rich-text-editable px-3 py-2 text-[15px] outline-none rounded-b-lg"
        style={{ minHeight }}
        onFocus={() => { isFocusedRef.current = true; updateTableContext(); }}
        onBlur={() => {
          isFocusedRef.current = false;
          if (suppressNextBlurEmitRef.current) {
            suppressNextBlurEmitRef.current = false;
            return;
          }
          emitChange();
        }}
        onInput={() => emitChange()}
        onMouseUp={updateTableContext}
        onKeyUp={updateTableContext}
        onKeyDown={handleTableTabKey}
        onClick={handleEditorClick}
        onPaste={(e) => {
          e.preventDefault();
          // Nếu clipboard có ảnh (chụp màn hình, copy ảnh từ nơi khác...) thì đưa vào dải đính
          // kèm giống nút "Chèn ảnh"; phần text luôn dán dạng thuần để tránh mang theo style lạ.
          const imageFiles = Array.from(e.clipboardData.items)
            .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
            .map((item) => item.getAsFile())
            .filter((file): file is File => !!file);

          if (imageFiles.length > 0) {
            void addImageFiles(imageFiles);
            return;
          }

          const text = e.clipboardData.getData('text/plain');
          // Văn bản dán vào có thể chứa công thức LaTeX (copy từ ChatGPT, tài liệu LaTeX...) — nhận
          // diện $$...$$ / \[...\] / \(...\) và tự động chuyển thành công thức hiển thị luôn.
          const { html, hasFormula } = buildPastedHtml(text);
          if (hasFormula) {
            document.execCommand('insertHTML', false, html);
          } else {
            document.execCommand('insertText', false, text);
          }
          emitChange();
        }}
      />
      <style>{`
        .rich-text-editable:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
        }
        .rich-text-editable .qh-formula {
          cursor: pointer;
          border-radius: 4px;
          padding: 0 2px;
        }
        .rich-text-editable .qh-formula:hover {
          background: #eff6ff;
          outline: 1px dashed #93c5fd;
        }
      `}</style>
    </div>
  );
}
