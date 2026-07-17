import React, { useEffect, useRef, useState } from 'react';
import { message, Image } from 'antd';
import { isLikelyHtml, sanitizeHtml } from '../utils/htmlContent';
import { compressImageFile } from '../utils/imageCompress';

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
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

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

  const btnClass = 'px-1.5 py-0.5 text-[12px] font-bold text-slate-600 hover:bg-slate-200 rounded transition-colors';

  return (
    <div className={`border border-slate-300 rounded-lg overflow-hidden ${className || ''}`}>
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 border-b border-slate-200 bg-slate-50">
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
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelected} />
        <span className="w-px h-4 bg-slate-300 mx-1" />
        <button type="button" className={btnClass} style={{ cursor: 'pointer' }} title="Xoá định dạng" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('removeFormat')}>Tx</button>
      </div>

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
        className="rich-text-editable px-3 py-2 text-[15px] outline-none"
        style={{ minHeight }}
        onFocus={() => { isFocusedRef.current = true; }}
        onBlur={() => { isFocusedRef.current = false; emitChange(); }}
        onInput={() => emitChange()}
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
          document.execCommand('insertText', false, text);
          emitChange();
        }}
      />
      <style>{`
        .rich-text-editable:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
}
