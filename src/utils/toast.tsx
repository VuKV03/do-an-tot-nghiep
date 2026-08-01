/**
 * Toast thông báo tự viết (glass morphism, theo mẫu tham khảo của người dùng) — thay cho `message`
 * mặc định của antd (vốn luôn nổi giữa-trên màn hình, không tuỳ biến vị trí được). Toast này cố định
 * ở góc trên-phải màn hình, nền kính mờ (backdrop-blur), viền màu trong suốt theo loại, icon "nảy"
 * (pulse) liên tục, và trượt vào bằng hiệu ứng bounce.
 * Dùng chung cho toàn dự án: import `{ toast }` để gọi ở bất kỳ đâu (không cần Provider/Context bọc
 * cây component — giống cách `message` của antd hoạt động), và mount `<ToastContainer />` một lần
 * trong component gốc của màn hình (hoặc App root khi đã ổn định) để hiển thị.
 *
 * API giữ tương thích gần như 1:1 với antd `message` để việc thay thế chỉ cần đổi tên gọi:
 *   toast.success('Nội dung')                                  // title tự động theo loại ("Thành công!")
 *   toast.error({ title: 'Lỗi!', content: 'Chi tiết...', key: 'abc', duration: 4 })
 *   toast.loading({ content: 'Đang xử lý...', key: 'abc' })     // duration mặc định 0 (không tự đóng)
 *   toast.success({ content: 'Xong!', key: 'abc' })             // cùng key → thay thế toast loading ở trên
 *   toast.destroy('abc')  // đóng theo key, hoặc không truyền key để đóng tất cả
 */
import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  CheckCircleFilled,
  CloseCircleFilled,
  ExclamationCircleFilled,
  InfoCircleFilled,
  LoadingOutlined,
  CloseOutlined,
} from '@ant-design/icons';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastOptions {
  /** Dòng tiêu đề in đậm. Bỏ trống sẽ tự dùng tiêu đề mặc định theo loại (vd: "Thành công!"). */
  title?: React.ReactNode;
  content: React.ReactNode;
  /** Toast cùng key sẽ thay thế toast trước đó thay vì chồng thêm — dùng cho pattern loading → success/error. */
  key?: string;
  /** Đơn vị giây. 0 = không tự đóng. Mặc định: loading = 0, còn lại = 4. */
  duration?: number;
}

type ToastInput = React.ReactNode | ToastOptions;

interface ToastItemData {
  id: string;
  type: ToastType;
  title: React.ReactNode;
  content: React.ReactNode;
  duration: number;
}

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 4,
  error: 4,
  warning: 4,
  info: 4,
  loading: 0,
};

const DEFAULT_TITLE: Record<ToastType, string> = {
  success: 'Thành công!',
  error: 'Lỗi!',
  warning: 'Cảnh báo!',
  info: 'Thông tin',
  loading: 'Đang xử lý...',
};

let toasts: ToastItemData[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach(l => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return toasts;
}

let uid = 0;
function nextId() {
  uid += 1;
  return `toast-${Date.now()}-${uid}`;
}

function isOptions(input: ToastInput): input is ToastOptions {
  return typeof input === 'object' && input !== null && !React.isValidElement(input) && 'content' in (input as object);
}

function normalize(input: ToastInput): ToastOptions {
  return isOptions(input) ? input : { content: input as React.ReactNode };
}

function push(type: ToastType, input: ToastInput): () => void {
  const opts = normalize(input);
  const id = opts.key ?? nextId();
  const duration = opts.duration ?? DEFAULT_DURATION[type];
  const item: ToastItemData = {
    id,
    type,
    title: opts.title ?? DEFAULT_TITLE[type],
    content: opts.content,
    duration,
  };

  const existingIndex = toasts.findIndex(t => t.id === id);
  toasts = existingIndex >= 0
    ? toasts.map((t, i) => (i === existingIndex ? item : t))
    : [...toasts, item];
  emit();

  return () => remove(id);
}

function remove(id: string) {
  if (!toasts.some(t => t.id === id)) return;
  toasts = toasts.filter(t => t.id !== id);
  emit();
}

function destroy(key?: string) {
  if (key) {
    remove(key);
  } else {
    toasts = [];
    emit();
  }
}

export const toast = {
  success: (input: ToastInput) => push('success', input),
  error: (input: ToastInput) => push('error', input),
  warning: (input: ToastInput) => push('warning', input),
  info: (input: ToastInput) => push('info', input),
  loading: (input: ToastInput) => push('loading', input),
  destroy,
};

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircleFilled />,
  error: <CloseCircleFilled />,
  warning: <ExclamationCircleFilled />,
  info: <InfoCircleFilled />,
  loading: <LoadingOutlined spin />,
};

// Màu viền kính-mờ (trong suốt) + màu icon/tiêu đề riêng cho từng loại — theo đúng bảng màu mẫu.
const TYPE_STYLES: Record<ToastType, { border: string; icon: string; title: string }> = {
  success: { border: 'rgba(16, 185, 129, 0.4)', icon: '#10b981', title: '#059669' },
  error: { border: 'rgba(239, 68, 68, 0.4)', icon: '#ef4444', title: '#dc2626' },
  warning: { border: 'rgba(245, 158, 11, 0.4)', icon: '#f59e0b', title: '#d97706' },
  info: { border: 'rgba(59, 130, 246, 0.4)', icon: '#3b82f6', title: '#1d4ed8' },
  loading: { border: 'rgba(100, 116, 139, 0.4)', icon: '#64748b', title: '#475569' },
};

const ENTER_TRANSFORM = 'translateX(120px)';
const EXIT_TRANSFORM = 'translateX(120px)';

function ToastRow({ item }: { item: ToastItemData }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const style = TYPE_STYLES[item.type];

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleClose = () => {
    setLeaving(true);
    setTimeout(() => remove(item.id), 400);
  };

  useEffect(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    if (item.duration > 0) {
      closeTimerRef.current = setTimeout(handleClose, item.duration * 1000);
    }
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, item.duration, item.type, item.content]);

  const shown = visible && !leaving;

  return (
    <div
      role="status"
      className="pointer-events-auto flex items-center gap-3 w-[340px] max-w-[420px] rounded-lg px-4 py-3.5 bg-white/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
      style={{
        border: `1px solid ${style.border}`,
        opacity: shown ? 1 : 0,
        transform: shown ? 'translateX(0)' : (leaving ? EXIT_TRANSFORM : ENTER_TRANSFORM),
        transition: leaving
          ? 'transform 0.4s ease, opacity 0.4s ease'
          : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease',
      }}
    >
      <span className="toast-icon-pulse text-xl leading-none shrink-0" style={{ color: style.icon }}>
        {ICONS[item.type]}
      </span>
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        <div className="text-[13px] font-bold tracking-wide" style={{ color: style.title }}>
          {item.title}
        </div>
        <div className="text-xs text-gray-500/80 leading-snug break-words">{item.content}</div>
      </div>
      {item.type !== 'loading' && (
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-700 hover:bg-black/5 shrink-0 cursor-pointer w-5 h-5 rounded flex items-center justify-center transition-colors"
          aria-label="Đóng thông báo"
        >
          <CloseOutlined className="text-[11px]" />
        </button>
      )}
    </div>
  );
}

/** Mount một lần trong màn hình/App root — render toàn bộ toast đang hoạt động ở góc trên-phải. */
export function ToastContainer() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return (
    <>
      <style>{`
        @keyframes toast-icon-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
        .toast-icon-pulse { display: inline-flex; animation: toast-icon-pulse 1.5s ease-in-out infinite; }
      `}</style>
      <div className="fixed top-5 right-5 z-[10000] flex flex-col gap-2.5 max-w-[420px] pointer-events-none">
        {items.map(item => (
          <ToastRow key={item.id} item={item} />
        ))}
      </div>
    </>
  );
}
