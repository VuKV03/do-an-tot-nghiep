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

  // Ô đang được focus phải đẩy phiên bản core mới nhất của chính nó lên context mỗi khi state RIÊNG
  // của ô đổi (không chỉ lúc focus) — vì các nút trên thanh công cụ dùng chung (vd: mở bảng chọn số
  // dòng/cột, mở popup công thức) làm thay đổi state RIÊNG của ô này, khiến ô này re-render với
  // core mới, nhưng context vẫn giữ core "cũ" từ lần focus nếu không chủ động cập nhật lại.
  //
  // PHẢI khai báo dependency array đúng bằng các state thật sự có thể đổi trong `core`, KHÔNG được
  // để effect chạy vô điều kiện mỗi render (không tham số) như trước — vì `core` là 1 object LITERAL
  // mới hoàn toàn ở mỗi lần gọi useRichTextCore(), nên setActiveCore(core) luôn bị coi là "đổi giá
  // trị" (khác reference) dù state bên trong không đổi gì, khiến Provider re-render → context đổi →
  // chính ô này re-render lại (vì cũng đọc context) → effect chạy lại → setActiveCore(core mới) →
  // ... lặp vô hạn ("Maximum update depth exceeded"), và giữa cơn lặp đó DOM ô nhập LaTeX (autoFocus
  // textarea trong popup) bị re-render dồn dập làm MẤT vị trí con trỏ đang gõ/xoá — chính là bug
  // "xoá 1 ký tự trong ô LaTeX thì con trỏ nhảy về cuối" khi dùng công thức trong bảng đáp án (ô
  // "Nội dung câu hỏi" đứng riêng không dùng context này nên không gặp lỗi).
  //
  // `|| core.showFormulaPicker` là bắt buộc, không phải tùy chọn: popup công thức có <textarea
  // autoFocus> bên trong, nên vừa mở popup là nó CƯỚP focus khỏi ô contentEditable này ngay lập
  // tức, khiến `isFocusedRef.current` rơi về false. Nếu chỉ xét theo focus, mọi thao tác sau đó
  // trong popup (gõ, dán, xoá, bấm Hủy) đều cập nhật đúng state NỘI BỘ của ô này (setFormulaLatex/
  // setShowFormulaPicker vẫn là setter thật, luôn hoạt động) nhưng `activeCore` ở context không
  // còn được đẩy cập nhật nữa — nên thanh công cụ/popup (render theo `activeCore`) vẫn hiển thị
  // đúng ảnh chụp CŨ từ trước lúc mất focus, khiến người dùng tưởng gõ/dán/xoá/Hủy "không có tác
  // dụng gì" dù dữ liệu bên trong đã đổi đúng (chỉ lộ ra khi click lại vào ô, buộc focus lại và
  // đẩy core mới nhất lên).
  useEffect(() => {
    if (core.isFocusedRef.current || core.showFormulaPicker) {
      setActiveCore(core);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    core.showFormulaPicker, core.formulaLatex, core.attachments,
    core.showTablePicker, core.hoverCell, core.isInTable, core.showSymbolPicker, core.isProcessingImage,
  ]);

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
