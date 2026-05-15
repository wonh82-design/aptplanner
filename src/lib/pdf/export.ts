/**
 * DOM 요소 → 캔버스 → PDF 다운로드 유틸.
 * html2canvas-pro 사용 (Tailwind v4의 oklch 색상 호환).
 */
'use client';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

export type PdfOptions = {
  filename: string;
  /** A4 세로 기준. mm. 기본 210×297 */
  format?: [number, number];
  /** 캔버스 해상도 배율. 클수록 선명하지만 파일 크다 */
  scale?: number;
  /** 페이지 여백 (mm) */
  margin?: number;
};

export async function exportElementToPdf(
  el: HTMLElement,
  opts: PdfOptions,
): Promise<void> {
  const { filename, format = [210, 297], scale = 2, margin = 8 } = opts;
  const [pageW, pageH] = format;
  const contentW = pageW - margin * 2;
  const contentH = pageH - margin * 2;

  const canvas = await html2canvas(el, {
    scale,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  // 캔버스를 페이지 폭에 맞춰 스케일
  const imgW = contentW;
  const imgH = (canvas.height * contentW) / canvas.width;

  let yLeft = imgH;
  let yOffset = 0;

  pdf.addImage(imgData, 'JPEG', margin, margin, imgW, imgH);
  yLeft -= contentH;

  while (yLeft > 0) {
    yOffset -= contentH;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', margin, margin + yOffset, imgW, imgH);
    yLeft -= contentH;
  }

  pdf.save(filename);
}
