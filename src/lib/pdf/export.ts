/**
 * DOM 요소 → 캔버스 → PDF 다운로드 유틸.
 * html2canvas-pro 사용 (Tailwind v4의 oklch 색상 호환).
 *
 * exportElementToPdf: 단일 요소 (자동 페이지 분할)
 * exportPagesToPdf: 여러 요소를 각각 별도 페이지로 (표지 + 본문 구조에 사용)
 */
'use client';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

export type PdfOptions = {
  filename: string;
  /** A4 기본 210×297 */
  format?: [number, number];
  /** 캔버스 해상도 배율 */
  scale?: number;
  /** 페이지 여백 (mm) */
  margin?: number;
};

async function renderToCanvas(el: HTMLElement, scale: number) {
  return html2canvas(el, {
    scale,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });
}

/** 단일 요소 → PDF (긴 콘텐츠는 자동 분할) */
export async function exportElementToPdf(el: HTMLElement, opts: PdfOptions): Promise<void> {
  const { filename, format = [210, 297], scale = 2, margin = 8 } = opts;
  const [pageW, pageH] = format;
  const contentW = pageW - margin * 2;
  const contentH = pageH - margin * 2;

  const canvas = await renderToCanvas(el, scale);
  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
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

/**
 * 여러 요소를 각각 PDF 페이지로 (표지 + 본문).
 * 각 요소가 한 페이지에 안 들어가면 그 요소 안에서 자동 분할.
 */
export async function exportPagesToPdf(
  elements: HTMLElement[],
  opts: PdfOptions,
): Promise<void> {
  const { filename, format = [210, 297], scale = 2, margin = 8 } = opts;
  const [pageW, pageH] = format;
  const contentW = pageW - margin * 2;
  const contentH = pageH - margin * 2;

  const pdf = new jsPDF('p', 'mm', 'a4');
  let isFirst = true;

  for (const el of elements) {
    if (!el) continue;
    const canvas = await renderToCanvas(el, scale);
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const imgW = contentW;
    const imgH = (canvas.height * contentW) / canvas.width;

    if (!isFirst) pdf.addPage();
    isFirst = false;

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
  }

  pdf.save(filename);
}
