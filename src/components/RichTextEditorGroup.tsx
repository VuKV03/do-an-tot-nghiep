import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  useRichTextCore,
  RichTextToolbarUI,
  RichTextAttachmentsStrip,
  RichTextEditableArea,
  type RichTextCore,
} from './RichTextEditor';

/**
 * Nhiều ô soạn thảo rich-text dùng CHUNG 1 thanh công cụ (thay vì mỗi ô 1 thanh riêng) — dùng cho
 * bảng "Nội dung trả lời" ở câu hỏi Phương án trắc nghiệm. Thanh công cụ thao tác lên ô đáp án đang
 * được focus: đặt con trỏ/bôi đen ở đáp án nào, bấm nút định dạng sẽ áp dụng cho đáp án đó.
 *
 * Cách dùng:
 * ```tsx
 * <RichTextGroupProvider>
 *   <RichTextGroupToolbar />
 *   <table>
 *     <tr><td><RichTextGroupCell value={...} onChange={...} /></td></tr>
 *     ...
 *   </table>
 * </RichTextGroupProvider>
 * ```
 */

interface RichTextGroupContextValue {
  activeCore: RichTextCore | null;
  setActiveCore: (core: RichTextCore) => void;
  /** Core "rỗng" không gắn với ô nào — chỉ để thanh công cụ luôn có gì đó render (giữ nguyên bố cục,
   * chỉ đổi trạng thái mờ/khoá) thay vì đổi hẳn sang 1 dòng chữ khác khi chưa có ô nào được focus. */
  placeholderCore: RichTextCore;
}

const RichTextGroupContext = createContext<RichTextGroupContextValue | null>(null);

export function RichTextGroupProvider({ children }: { children: React.ReactNode }) {
  const [activeCore, setActiveCore] = useState<RichTextCore | null>(null);
  const placeholderCore = useRichTextCore({});
  return (
    <RichTextGroupContext.Provider value={{ activeCore, setActiveCore, placeholderCore }}>
      {children}
    </RichTextGroupContext.Provider>
  );
}

function useRichTextGroupContext(): RichTextGroupContextValue {
  const ctx = useContext(RichTextGroupContext);
  if (!ctx) {
    throw new Error('RichTextGroupToolbar/RichTextGroupCell phải nằm trong <RichTextGroupProvider>');
  }
  return ctx;
}

/** Thanh công cụ dùng chung — đặt 1 lần phía trên các ô đáp án. Luôn hiển thị đúng 1 bố cục (không
 * đổi hẳn sang dòng chữ khác khi chưa có ô nào được chọn) — chỉ mờ/khoá thao tác cho tới khi người
 * dùng đặt con trỏ vào 1 ô đáp án, tránh cảm giác thanh công cụ "bật tắt" đột ngột. */
export function RichTextGroupToolbar() {
  const { activeCore, placeholderCore } = useRichTextGroupContext();
  const isActive = !!activeCore;
  return (
    <div className="bg-slate-50 rounded-t-[11px]">
      <div className={isActive ? '' : 'opacity-40 pointer-events-none select-none'}>
        <RichTextToolbarUI core={activeCore ?? placeholderCore} />
      </div>

    </div>
  );
}

/** 1 ô đáp án — không có thanh công cụ riêng; khi được focus sẽ "chiếm" thanh công cụ dùng chung. */
export function RichTextGroupCell({
  value,
  onChange,
  placeholder,
  minHeight = 40,
  className,
}: {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
}) {
  const core = useRichTextCore({ value, onChange });
  const { activeCore, setActiveCore } = useRichTextGroupContext();

  // Ô đang được focus phải luôn đẩy phiên bản core mới nhất của chính nó lên context ở mỗi lần
  // render (không chỉ lúc focus) — vì các nút trên thanh công cụ dùng chung (vd: mở bảng chọn số
  // dòng/cột, mở popup công thức) làm thay đổi state RIÊNG của ô này, khiến ô này re-render với
  // core mới, nhưng context vẫn giữ core "cũ" từ lần focus nếu không chủ động cập nhật lại.
  useEffect(() => {
    if (core.isFocusedRef.current) {
      setActiveCore(core);
    }
  });

  const isActive = activeCore === core;

  return (
    <div
      className={`border rounded-lg transition-colors ${isActive ? 'border-blue-400 ring-1 ring-blue-100' : 'border-slate-200'} ${className || ''}`}
    >
      <RichTextAttachmentsStrip core={core} />
      <RichTextEditableArea
        core={core}
        placeholder={placeholder}
        minHeight={minHeight}
        roundedTop
        onFocusExtra={() => setActiveCore(core)}
      />
    </div>
  );
}
