/**
 * Tiện ích dùng chung cho các bảng HTML `<table>` tự viết (không phải `antd/Table`) trong dự án:
 * (1) thêm đường viền dọc rõ ràng ngăn cách giữa các cột, (2) cho phép kéo để co giãn độ rộng
 * từng cột (kéo cạnh phải của tiêu đề cột).
 *
 * Cách dùng:
 *   const { colGroup, startResize, totalWidth } = useResizableColumns([40, 56, 110, 260, ...]); // 1 số/cột, đúng thứ tự
 *
 *   (min-width = totalWidth là bắt buộc: nếu không, `table-fixed` + `w-full` sẽ tự co tỉ lệ
 *   mọi cột lại vừa khung chứa hẹp hơn, làm nội dung có kích thước cố định (badge, nút...) bị
 *   tràn ra ngoài cột thay vì để khung `overflow-x-auto` cha cuộn ngang)
 *   <table style={{ minWidth: totalWidth }} className={`w-full table-fixed border-collapse ${RESIZABLE_TABLE_CLASS}`}>
 *     {colGroup}
 *     <thead><tr>
 *       <th className="relative ...">
 *         Tên cột
 *         <ColResizeHandle onMouseDown={startResize(0)} />
 *       </th>
 *       ...
 *     </tr></thead>
 *     <tbody>...</tbody>
 *   </table>
 *   <ResizableTableStyles />   (mount 1 lần ở đâu đó trong màn hình)
 *
 * Muốn 1 cột có viền đậm nổi bật hơn các cột khác (cả `<th>` lẫn mọi `<td>` của cột đó): thêm
 * class `STRONG_COL_BORDER_CLASS` vào các ô đó.
 *
 * Cột co giãn được (resizable) thì nội dung có thể bị cắt (truncate) bất cứ lúc nào tuỳ người
 * dùng kéo hẹp cột tới đâu — dùng `<TruncatedText text={...} />` thay cho việc render text trực
 * tiếp trong ô để tự động hiện Tooltip đầy đủ nội dung khi (và chỉ khi) nó thực sự bị cắt.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Tooltip } from 'antd';

/** Gắn vào `<table>` để áp dụng CSS viền dọc từ `ResizableTableStyles`. */
export const RESIZABLE_TABLE_CLASS = 'app-resizable-table';
/** Gắn vào `<th>`/`<td>` của 1 cột để cột đó có viền đậm bao quanh, nổi bật hơn các cột khác. */
export const STRONG_COL_BORDER_CLASS = 'app-col-strong-border';

export function useResizableColumns(initialWidths: number[], options?: { minWidth?: number }) {
  const minWidth = options?.minWidth ?? 48;
  const [widths, setWidths] = useState<number[]>(initialWidths);
  const dragRef = useRef<{ index: number; startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const delta = e.clientX - drag.startX;
      setWidths(prev => {
        const next = [...prev];
        next[drag.index] = Math.max(minWidth, drag.startWidth + delta);
        return next;
      });
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [minWidth]);

  const startResize = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { index, startX: e.clientX, startWidth: widths[index] };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const colGroup = (
    <colgroup>
      {widths.map((w, i) => (
        <col key={i} style={{ width: w }} />
      ))}
    </colgroup>
  );

  const totalWidth = widths.reduce((sum, w) => sum + w, 0);

  return { widths, startResize, colGroup, totalWidth };
}

/** Đặt bên trong 1 `<th className="relative">` — tay kéo vô hình phủ cạnh phải, hiện màu khi hover/kéo. */
export function ColResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <span
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation="vertical"
      className="absolute top-0 bottom-0 -right-[4px] w-[8px] cursor-col-resize select-none z-20 flex justify-center group/resize"
    >
      <span className="w-[2px] h-full bg-transparent group-hover/resize:bg-blue-400 group-active/resize:bg-blue-600 transition-colors" />
    </span>
  );
}

/** Mount 1 lần cạnh bảng dùng `RESIZABLE_TABLE_CLASS` — tiêm CSS viền dọc giữa các cột + viền đậm cho cột đánh dấu. */
export function ResizableTableStyles() {
  return (
    <style>{`
      .${RESIZABLE_TABLE_CLASS} th,
      .${RESIZABLE_TABLE_CLASS} td {
        border-right: 1px solid #e2e8f0;
      }
      .${RESIZABLE_TABLE_CLASS} th:last-child,
      .${RESIZABLE_TABLE_CLASS} td:last-child {
        border-right: none;
      }
      .${RESIZABLE_TABLE_CLASS} .${STRONG_COL_BORDER_CLASS} {
        border-left: 2px solid #64748b !important;
        border-right: 2px solid #64748b !important;
      }
    `}</style>
  );
}

const DEFAULT_TOOLTIP_MAX_LENGTH = 512;

/**
 * Bọc nội dung text 1 ô của bảng — tự cắt (`truncate`) khi cột không đủ rộng để hiển thị hết, và
 * chỉ hiện Tooltip (đầy đủ nội dung, giới hạn `maxTooltipLength` ký tự) khi nội dung thực sự đang
 * bị cắt (so `scrollWidth`/`clientWidth`, theo dõi qua `ResizeObserver` nên vẫn đúng khi người
 * dùng kéo co giãn cột sau đó).
 */
export function TruncatedText({
  text,
  maxTooltipLength = DEFAULT_TOOLTIP_MAX_LENGTH,
  className,
  tooltipText,
}: {
  text: React.ReactNode;
  maxTooltipLength?: number;
  className?: string;
  /** Nội dung tooltip hiển thị khi bị cắt — chỉ định rõ khi `text` không phải string/number (vd:
   * JSX có chứa công thức toán render sẵn). Nhận cả ReactNode (vd `renderQuestionPreview(...)`) để
   * tooltip hiện đúng công thức KaTeX đã render thay vì mã LaTeX thô — truyền string thì vẫn cắt
   * theo `maxTooltipLength` như trước, truyền ReactNode thì hiện nguyên vẹn, không cắt độ dài. */
  tooltipText?: React.ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setIsTruncated(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  const resolvedTooltip: React.ReactNode =
    tooltipText ?? (typeof text === 'string' ? text : typeof text === 'number' ? String(text) : '');
  const tooltipContent = typeof resolvedTooltip === 'string'
    ? (resolvedTooltip.length > maxTooltipLength ? `${resolvedTooltip.slice(0, maxTooltipLength)}…` : resolvedTooltip)
    : resolvedTooltip;
  const hasTooltipContent = typeof tooltipContent === 'string' ? !!tooltipContent : tooltipContent != null && tooltipContent !== '';

  // Luôn giữ nguyên 1 cấu trúc <Tooltip><span>...</Tooltip> — không rẽ nhánh trả về `<span>` trần
  // tuỳ theo `isTruncated`, vì đổi cấu trúc cây JSX gốc sẽ khiến React unmount/remount lại chính
  // `<span ref>` đó mỗi khi trạng thái đổi, làm mất ResizeObserver đang gắn và "tự reset" isTruncated
  // về false ngay sau lần đo đúng đầu tiên. `title` rỗng thì antd Tooltip tự không hiện popup.
  return (
    <Tooltip title={isTruncated && hasTooltipContent ? tooltipContent : ''} placement="topLeft">
      <span ref={ref} className={`block truncate ${className ?? ''}`}>
        {text}
      </span>
    </Tooltip>
  );
}
