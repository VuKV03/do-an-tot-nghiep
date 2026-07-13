/**
 * Xuất đề thi ra file .docx thật (OOXML, dùng thư viện `docx`) — thay cho cách cũ đặt tên .doc
 * nhưng nội dung thực chất là RTF (Word desktop tự nhận diện mở được, nhưng không phải file Word
 * chuẩn nên có thể cảnh báo/lỗi trên Word Online, LibreOffice, Google Docs...).
 * Dùng chung cho ExamManagementModule.tsx và ModalSinhDeHoanVi.tsx để không lặp lại logic build.
 */
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import type { Question } from '../types';
import { htmlToDocxParagraphs } from './htmlToDocx';

function formatAnswer(correctAnswer: string | string[] | undefined): string {
  return Array.isArray(correctAnswer) ? correctAnswer.join(', ') : (correctAnswer ?? '');
}

export function buildExamDocxDocument(title: string, subject: string, grade: string, questions: Question[]): Document {
  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: title, bold: true })],
    }),
    new Paragraph({ children: [new TextRun({ text: `Môn: ${subject}`, bold: true })] }),
    new Paragraph({ children: [new TextRun({ text: `Khối: ${grade}`, bold: true })] }),
    new Paragraph({ text: '' }),
  ];

  questions.forEach((q, i) => {
    children.push(...htmlToDocxParagraphs(q.text, new TextRun({ text: `Câu ${i + 1}: `, bold: true })));
    (q.options || []).forEach((opt, oi) => {
      children.push(new Paragraph({ text: `${String.fromCharCode(65 + oi)}. ${opt}` }));
    });
    children.push(new Paragraph({
      children: [new TextRun({ text: `Đáp án: ${formatAnswer(q.correctAnswer)}`, italics: true })],
    }));
    children.push(new Paragraph({ text: '' }));
  });

  return new Document({ sections: [{ children }] });
}

export async function buildExamDocxBlob(title: string, subject: string, grade: string, questions: Question[]): Promise<Blob> {
  return Packer.toBlob(buildExamDocxDocument(title, subject, grade, questions));
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
