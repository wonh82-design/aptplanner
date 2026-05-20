#!/usr/bin/env node
/**
 * Phase 1 — 자재마스터 우선순위 분류 + CSV 체크리스트 생성.
 *
 * 사용:
 *   node scripts/phase1-build-checklist.mjs
 *
 * 산출:
 *   docs/phase1-material-images-checklist.csv  (A그룹 + B그룹 자재 체크리스트)
 *   콘솔에 그룹별 통계 출력
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const dataPath = path.join(ROOT, 'src/data/materials.json');
const outDir = path.join(ROOT, 'docs');
const outCsv = path.join(outDir, 'phase1-material-images-checklist.csv');

// === 우선순위 분류 ===
// A그룹: 시각적으로 가장 중요 — 사용자가 매번 보고 의사결정 영향이 큼
const GROUP_A_CATEGORIES = new Set([
  '마루', '도배', '타일', '욕실', '주방가구', '도어', '중문',
  '일반가구', '에어컨', '실링팬', '창호',
]);
// B그룹: 시각적이지만 임팩트 작음 — 여유 있을 때 추가
const GROUP_B_CATEGORIES = new Set([
  '몰딩', '걸레받이', '확장',
]);
// 조명 work_type — 카테고리에는 없지만 A그룹으로
const LIGHTING_PREFIXES = ['lighting_'];
// 나머지는 C그룹: 전기·설비·철거·단열·도장·실리콘·조적/방수·필름·유리·목공사·기타
//                사진 의미 거의 없음 (시공자 외 사용자가 보지 않음)

// 카테고리 정렬 우선순위 — 사용자가 자주 보는 큰 임팩트 자재부터
// (조명은 work_type 기준 별도 그룹으로 분리 표시)
const CATEGORY_ORDER = [
  '마루', '도배', '타일', '욕실', '주방가구',
  '조명',  // virtual category (work_type lighting_*)
  '도어', '중문', '일반가구',
  '에어컨', '실링팬', '창호',
  '몰딩', '걸레받이', '확장',
];

function groupOf(m) {
  const wt = m.work_type ?? '';
  const cat = m.category ?? '';
  const isLighting = LIGHTING_PREFIXES.some((p) => wt.startsWith(p));

  // 시각적 카테고리는 현장시공(인건비)이어도 카테고리 대표 사진 등록 권장 → A/B 유지
  if (isLighting) return 'A';
  if (GROUP_A_CATEGORIES.has(cat)) return 'A';
  if (GROUP_B_CATEGORIES.has(cat)) return 'B';

  // 시각적이지 않은 카테고리 + 현장시공 = 사진 불필요
  if (m.brand === '현장시공') return 'X';

  // 그 외 (실제 자재인데 시각적 카테고리 아닌 경우 — 거의 없음)
  return 'C';
}

/** 표시용 카테고리 — 조명 work_type은 '전기' 대신 '조명'으로 */
function displayCategory(m) {
  const wt = m.work_type ?? '';
  if (LIGHTING_PREFIXES.some((p) => wt.startsWith(p))) return '조명';
  return m.category ?? '';
}

function catOrderIdx(cat) {
  const i = CATEGORY_ORDER.indexOf(cat);
  return i === -1 ? 999 : i;
}

const GRADE_ORDER = { '가성비': 0, '표준': 1, '고급': 2, '단일등급': 3 };

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// === 메인 ===
const raw = fs.readFileSync(dataPath, 'utf-8');
const data = JSON.parse(raw);

const counts = { A: 0, B: 0, C: 0, X: 0 };
const catBy = { A: new Map(), B: new Map(), C: new Map() };
for (const m of data) {
  const g = groupOf(m);
  counts[g] += 1;
  if (g === 'X') continue; // 현장시공은 통계 표시 안 함
  const cat = displayCategory(m) || '(no category)';
  catBy[g].set(cat, (catBy[g].get(cat) ?? 0) + 1);
}

console.log('=== 그룹별 자재 수 ===');
console.log(`  A그룹 (필수, 시각적 중요): ${counts.A}개`);
console.log(`  B그룹 (보조): ${counts.B}개`);
console.log(`  C그룹 (사진 의미 적음): ${counts.C}개`);
console.log(`  X (현장시공 — 사진 불필요): ${counts.X}개`);
console.log(`  합계: ${data.length}개`);
console.log();
for (const g of ['A', 'B']) {
  console.log(`=== ${g}그룹 카테고리 분포 ===`);
  const entries = Array.from(catBy[g].entries())
    .sort((a, b) => catOrderIdx(a[0]) - catOrderIdx(b[0]) || b[1] - a[1]);
  for (const [cat, n] of entries) console.log(`    ${cat}: ${n}`);
  console.log();
}

// === CSV 작성 ===
fs.mkdirSync(outDir, { recursive: true });
const header = [
  '그룹', '우선순위', '체크', 'material_id', '카테고리', '서브카테고리',
  '브랜드', '제품명', 'installer_spec', '등급', 'work_type', '단가(원)',
  'image_url (이걸 채우세요)', '비고',
];

const rows = [];
for (const m of data) {
  const g = groupOf(m);
  if (g === 'C' || g === 'X') continue; // C: 사진 의미 적음 / X: 현장시공
  const cat = displayCategory(m);
  rows.push({
    sortKey: [
      g === 'A' ? 0 : 1,
      catOrderIdx(cat),
      m.sub_category ?? '',
      GRADE_ORDER[m.primary_grade] ?? 9,
      m.brand ?? '',
    ],
    cols: [
      g,
      g === 'A' ? '높음' : '보통',
      '☐',
      m.material_id,
      cat,
      m.sub_category ?? '',
      m.brand ?? '',
      m.product_line ?? '',
      m.installer_spec ?? '',
      m.primary_grade ?? '',
      m.work_type ?? '',
      m.total_unit_price ?? 0,
      '', // image_url 빈칸
      m.brand === '현장시공'
        ? '시공항목 — 카테고리 대표 이미지로 등록 (예: 일반 도어/조명 사진)'
        : '',
    ],
  });
}

rows.sort((a, b) => {
  for (let i = 0; i < a.sortKey.length; i++) {
    if (a.sortKey[i] < b.sortKey[i]) return -1;
    if (a.sortKey[i] > b.sortKey[i]) return 1;
  }
  return 0;
});

// UTF-8 BOM 포함 (엑셀에서 한글 깨짐 방지)
const lines = ['﻿' + header.map(csvEscape).join(',')];
for (const r of rows) lines.push(r.cols.map(csvEscape).join(','));
fs.writeFileSync(outCsv, lines.join('\r\n'), 'utf-8');

console.log('=== CSV 생성 완료 ===');
console.log(`  파일: ${path.relative(ROOT, outCsv)}`);
console.log(`  A+B 그룹 합계: ${rows.length}개 자재`);
console.log();
console.log('다음 작업: 이 CSV를 구글 시트로 열어 image_url 컬럼에 구글 드라이브 공유 링크를 채워주세요.');
console.log('자세한 작업 절차는 docs/phase1-image-registration-guide.md 참고.');
