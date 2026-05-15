/**
 * DOM 요소 → PDF 다운로드 유틸.
 * html2canvas-pro 사용 (Tailwind v4의 oklch 색상 호환).
 *
 * - exportElementToPdf: 단일 요소 자동 분할 (구버전 호환)
 * - exportPagesToPdf:   여러 요소 = 각 페이지
 * - exportPagedPdf:     root 안의 [data-pdf-page] 요소들을 각각 페이지로 → 표 잘림 방지
 */
'use client';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

export type Orientation = 'p' | 'l';

export type PdfOptions = {
  filename: string;
  orientation?: Orientation;
  /** 미지정 시 orientation에 따라 자동 (세로 210×297 / 가로 297×210) */
  format?: [number, number];
  /** 캔버스 해상도 배율 */
  scale?: number;
  /** 페이지 여백 (mm) */
  margin?: number;
};

function defaultFormat(orientation: Orientation): [number, number] {
  return orientation === 'l' ? [297, 210] : [210, 297];
}

async function renderToCanvas(el: HTMLElement, scale: number) {
  return html2canvas(el, {
    scale,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });
}

/** 단일 요소 → PDF (긴 콘텐츠는 자동 분할 — 표 잘림 가능) */
export async function exportElementToPdf(el: HTMLElement, opts: PdfOptions): Promise<void> {
  const orientation = opts.orientation ?? 'p';
  const { filename, format = defaultFormat(orientation), scale = 2, margin = 8 } = opts;
  const [pageW, pageH] = format;
  const contentW = pageW - margin * 2;
  const contentH = pageH - margin * 2;

  const canvas = await renderToCanvas(el, scale);
  const pdf = new jsPDF(orientation, 'mm', 'a4');
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
 * 여러 요소 → 각각 새 PDF 페이지로.
 * 각 요소가 한 페이지보다 크면 그 요소 안에서 자동 분할 (표 잘림 가능).
 */
export async function exportPagesToPdf(
  elements: HTMLElement[],
  opts: PdfOptions,
): Promise<void> {
  const orientation = opts.orientation ?? 'p';
  const { filename, format = defaultFormat(orientation), scale = 2, margin = 8 } = opts;
  const [pageW, pageH] = format;
  const contentW = pageW - margin * 2;
  const contentH = pageH - margin * 2;

  const pdf = new jsPDF(orientation, 'mm', 'a4');
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

/**
 * root 안에서 [data-pdf-page] 요소를 찾아 각각 한 PDF 페이지로 처리.
 * 표·섹션 단위로 명시 분할 → 페이지 중간에 표가 잘리지 않음.
 * 단일 요소가 한 페이지를 초과하면 그 요소 내부에서 자동 분할.
 */
export async function exportPagedPdf(
  root: HTMLElement,
  opts: PdfOptions,
): Promise<void> {
  const pages = Array.from(root.querySelectorAll<HTMLElement>('[data-pdf-page]'));
  if (pages.length === 0) {
    await exportElementToPdf(root, opts);
    return;
  }
  await exportPagesToPdf(pages, opts);
}
