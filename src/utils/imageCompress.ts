/**
 * Tự động resize + nén ảnh phía client trước khi nhúng base64 vào nội dung câu hỏi, để giáo
 * viên có thể tải lên ảnh chụp/screenshot độ phân giải gốc (thường vài MB) mà không cần tự
 * chỉnh sửa/giảm kích thước — hệ thống tự lo phần đó.
 */

const TARGET_MAX_BASE64_BYTES = 60 * 1024; // ~60KB text/ảnh, để tổng nội dung câu hỏi vẫn nằm trong giới hạn cột lưu trữ hiện tại
const INITIAL_MAX_WIDTH = 900;
const MIN_WIDTH = 220;

export interface CompressedImage {
  dataUrl: string;
  width: number;
  height: number;
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Không đọc được ảnh — tệp có thể bị hỏng.'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Không đọc được tệp ảnh.'));
    reader.readAsDataURL(file);
  });
}

function drawToDataUrl(img: HTMLImageElement, maxWidth: number, quality: number, keepPng: boolean): CompressedImage {
  const scale = img.naturalWidth > maxWidth ? maxWidth / img.naturalWidth : 1;
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh (canvas).');
  ctx.drawImage(img, 0, 0, width, height);

  const dataUrl = keepPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', quality);
  return { dataUrl, width, height };
}

/**
 * Resize ảnh về chiều rộng tối đa hợp lý và nén dần (giảm chất lượng rồi giảm kích thước) cho
 * tới khi base64 đủ nhỏ để lưu trữ, hoặc đạt giới hạn tối thiểu. Ảnh PNG có khả năng trong suốt
 * được giữ định dạng PNG (không ép JPEG) nhưng vẫn bị resize nếu quá lớn.
 */
export async function compressImageFile(file: File): Promise<CompressedImage> {
  const img = await loadImageFromFile(file);
  const keepPng = file.type === 'image/png';

  let maxWidth = INITIAL_MAX_WIDTH;
  let quality = 0.82;
  let result = drawToDataUrl(img, maxWidth, quality, keepPng);

  // Giảm dần: ưu tiên hạ chất lượng JPEG trước, hết mức mới hạ tiếp kích thước
  let guard = 0;
  while (result.dataUrl.length > TARGET_MAX_BASE64_BYTES && guard < 10) {
    guard += 1;
    if (!keepPng && quality > 0.35) {
      quality -= 0.12;
    } else if (maxWidth > MIN_WIDTH) {
      maxWidth = Math.max(MIN_WIDTH, Math.round(maxWidth * 0.75));
    } else {
      break;
    }
    result = drawToDataUrl(img, maxWidth, quality, keepPng);
  }

  // PNG không có bước giảm chất lượng (chỉ giảm kích thước) — ảnh chụp/screenshot nhiều chi tiết
  // dán dạng PNG vẫn có thể vượt ngưỡng dù đã co về MIN_WIDTH. Trường hợp đó, chấp nhận đánh đổi
  // độ trong suốt để ép về JPEG (có giảm chất lượng), đảm bảo luôn nằm trong giới hạn lưu trữ.
  if (keepPng && result.dataUrl.length > TARGET_MAX_BASE64_BYTES) {
    let jpegQuality = 0.75;
    result = drawToDataUrl(img, maxWidth, jpegQuality, false);
    let jpegGuard = 0;
    while (result.dataUrl.length > TARGET_MAX_BASE64_BYTES && jpegGuard < 10) {
      jpegGuard += 1;
      if (jpegQuality > 0.35) {
        jpegQuality -= 0.12;
      } else if (maxWidth > MIN_WIDTH) {
        maxWidth = Math.max(MIN_WIDTH, Math.round(maxWidth * 0.75));
      } else {
        break;
      }
      result = drawToDataUrl(img, maxWidth, jpegQuality, false);
    }
  }

  return result;
}
