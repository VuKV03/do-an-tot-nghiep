/**
 * Xuất dữ liệu dạng bảng ra file Excel (.xlsx) thật (OOXML, dùng thư viện `xlsx-js-style` —
 * fork của SheetJS có hỗ trợ ghi style cell, bản `xlsx` gốc miễn phí không ghi được style khi xuất).
 * Module dùng chung cho toàn dự án — bất kỳ màn hình nào có bảng "Kết quả tìm kiếm" đều
 * có thể gọi `exportToExcel` để xuất đúng những cột/dòng đang hiển thị, không cần lặp lại
 * logic build worksheet ở từng nơi. Header luôn in đậm, toàn bộ ô có viền (giống bảng).
 * Căn ngang mặc định là trái, đặt `align: 'center'` cho cột nào cần căn giữa (số liệu ngắn
 * như STT/điểm/thời gian).
 */
import * as XLSX from 'xlsx-js-style';
import type { CellStyle } from 'xlsx-js-style';

export interface ExcelColumn<T> {
  header: string;
  accessor: (row: T, index: number) => string | number;
  width?: number;
  align?: 'left' | 'center' | 'right';
}

// Màu ARGB đủ 8 ký tự (FF + RRGGBB) — thiếu kênh alpha (chỉ 6 ký tự RRGGBB) khiến Excel coi màu
// không hợp lệ và bỏ qua luôn viền, dù cấu trúc style object vẫn khai báo đúng.
const THIN_BORDER = { style: 'thin' as const, color: { rgb: 'FF94A3B8' } };

function cellStyle(align: 'left' | 'center' | 'right', bold: boolean): CellStyle {
  return {
    alignment: { horizontal: align, vertical: 'center', wrapText: true },
    border: { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER },
    ...(bold ? { font: { bold: true }, fill: { fgColor: { rgb: 'F1F5F9' } } } : {}),
  };
}

export function exportToExcel<T>(
  data: T[],
  columns: ExcelColumn<T>[],
  fileName: string,
  sheetName = 'Sheet1',
): void {
  const aoa = [
    columns.map(c => c.header),
    ...data.map((row, i) => columns.map(c => c.accessor(row, i))),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  worksheet['!cols'] = columns.map(c => ({ wch: c.width ?? 18 }));

  const rowCount = data.length + 1;
  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < columns.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = worksheet[cellRef];
      if (cell) cell.s = cellStyle(columns[c].align ?? 'left', r === 0);
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}
