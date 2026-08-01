/**
 * Xuất đề thi ra file .docx thật (OOXML, dùng thư viện `docx`) — thay cho cách cũ đặt tên .doc
 * nhưng nội dung thực chất là RTF (Word desktop tự nhận diện mở được, nhưng không phải file Word
 * chuẩn nên có thể cảnh báo/lỗi trên Word Online, LibreOffice, Google Docs...).
 * Dùng chung cho ExamManagementModule.tsx, ModalSinhDeHoanVi.tsx, PackageManagementModule.tsx để
 * không lặp lại logic build.
 *
 * Cấu trúc theo đúng đề thi tốt nghiệp THPT (Thông tư 22/2024) — tiêu đề/thời gian/họ tên-SBD, rồi
 * chia Phần I/II/III kèm hướng dẫn làm bài, đánh số lại "Câu 1" ở mỗi Phần (khớp PART_META ở
 * ExamContentDisplay.tsx và cách lineNumber được lưu — xem ModalSinhDeHoanVi.tsx/examParts.ts).
 * Trước đây liệt kê phẳng "Câu 1..hết" không phân Phần, options/đáp án dùng thẳng chuỗi HTML thô làm
 * text (lộ tag HTML, không giữ định dạng/công thức toán) — nay dùng htmlToDocxParagraphs cho MỌI nội
 * dung có thể là rich-text (câu hỏi, phương án, phát biểu Đúng/Sai, đáp án).
 */
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, Table, TextRun } from 'docx';
import type { Question, TrueFalseStatement } from '../types';
import { htmlToDocxParagraphs } from './htmlToDocx';
import { PART_META } from './examParts';

function formatAnswer(correctAnswer: string | string[] | undefined): string {
  return Array.isArray(correctAnswer) ? correctAnswer.join(', ') : (correctAnswer ?? '');
}

const STATEMENT_LABELS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

/** Câu Đúng/Sai cũ có thể thiếu mảng `statements` (dữ liệu tạo trước khi cột này tồn tại) — suy ra từ
 * `options` (mirror nội dung) khi đó, đáp án coi như chưa xác định (false) thay vì crash/bỏ sót ý. */
function resolveStatements(q: Question): Pick<TrueFalseStatement, 'content' | 'isCorrect'>[] {
  if (q.statements && q.statements.length > 0) return q.statements;
  return (q.options || []).map((content) => ({ content, isCorrect: false }));
}

export function buildExamDocxDocument(
  title: string,
  subject: string,
  grade: string,
  questions: Question[],
  duration: number = 90,
  /** true (mặc định) — có kèm đáp án dưới mỗi câu, dùng cho bản giáo viên đối chiếu. false — bỏ hẳn
   * dòng "Đáp án"/tô đúng-sai (chỉ còn câu hỏi + phương án), dùng để phát đề thi thật cho thí sinh. */
  includeAnswers: boolean = true,
): Document {
  const dashLine = '.'.repeat(60);
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: title, bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Môn: ${subject} — Khối: ${grade}`, bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Thời gian làm bài: ${duration} phút, không kể thời gian phát đề`, italics: true })],
    }),
    new Paragraph({ text: '' }),
    new Paragraph({ children: [new TextRun({ text: `Họ, tên thí sinh: ${dashLine}` })] }),
    new Paragraph({ children: [new TextRun({ text: `Số báo danh: ${dashLine}` })] }),
    new Paragraph({ text: '' }),
  ];

  // Nhóm câu hỏi theo đúng cấu trúc 3 Phần — giống hệt cách ExamContentDisplay.tsx nhóm để xem trước,
  // dùng chung PART_META (examParts.ts) để tránh lệch giữa màn xem trước và file xuất ra. Câu hỏi
  // không khớp 3 loại này (vd 'multiple' — câu hỏi nhóm) dồn vào 1 mục phụ ở cuối, không bị bỏ sót.
  const knownTypes = new Set(PART_META.map(p => p.type));
  const groups = [
    ...PART_META.map(part => {
      const items = questions.filter(q => q.type === part.type);
      return { header: part.header, instruction: part.instruction.replace('N', String(items.length)), items };
    }).filter(g => g.items.length > 0),
    ...(questions.some(q => !knownTypes.has(q.type))
      ? [{ header: 'Câu hỏi khác', instruction: '', items: questions.filter(q => !knownTypes.has(q.type)) }]
      : []),
  ];

  groups.forEach((group) => {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: group.header, bold: true })],
    }));
    if (group.instruction) {
      children.push(new Paragraph({ children: [new TextRun({ text: group.instruction, italics: true })] }));
    }
    children.push(new Paragraph({ text: '' }));

    group.items.forEach((q, localIdx) => {
      const num = localIdx + 1;
      children.push(...htmlToDocxParagraphs(q.text, new TextRun({ text: `Câu ${num}: `, bold: true })));

      if (q.type === 'true_false') {
        const statements = resolveStatements(q);
        statements.forEach((st, si) => {
          const label = STATEMENT_LABELS[si] || String(si + 1);
          children.push(...htmlToDocxParagraphs(st.content, new TextRun({ text: `${label}) `, bold: false })));
        });
        if (includeAnswers) {
          const answerSummary = statements
            .map((st, si) => `${STATEMENT_LABELS[si] || si + 1}) ${st.isCorrect ? 'Đúng' : 'Sai'}`)
            .join(', ');
          children.push(new Paragraph({
            children: [new TextRun({ text: `Đáp án: ${answerSummary}`, italics: true })],
          }));
        }
      } else {
        // single (Phần I) — liệt kê phương án A/B/C/D. short (Phần III)/loại khác — không có phương
        // án, chỉ có đáp án ngay bên dưới.
        (q.options || []).forEach((opt, oi) => {
          const letter = String.fromCharCode(65 + oi);
          children.push(...htmlToDocxParagraphs(opt, new TextRun({ text: `${letter}. ` })));
        });
        if (includeAnswers) {
          children.push(...htmlToDocxParagraphs(
            formatAnswer(q.correctAnswer),
            new TextRun({ text: 'Đáp án: ', italics: true }),
          ));
        }
      }

      children.push(new Paragraph({ text: '' }));
    });
  });

  return new Document({ sections: [{ children }] });
}

export async function buildExamDocxBlob(
  title: string,
  subject: string,
  grade: string,
  questions: Question[],
  duration: number = 90,
  includeAnswers: boolean = true,
): Promise<Blob> {
  return Packer.toBlob(buildExamDocxDocument(title, subject, grade, questions, duration, includeAnswers));
}

export function triggerBlobDownload(blob: Blob, fileNameNoExt: string, ext: string): void {
  const element = document.createElement('a');
  element.href = URL.createObjectURL(blob);
  element.download = `${fileNameNoExt}.${ext}`;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  URL.revokeObjectURL(element.href);
}
