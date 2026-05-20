#!/usr/bin/env node
/**
 * 자재마스터 image_url 등록률 통계.
 *
 * 사용:
 *   npm run image-stats
 *   또는: node scripts/image-stats.mjs
 *
 * 출력:
 *   - 전체 등록률 (n / m, %)
 *   - 카테고리별 등록률 + 진행 바
 *   - 등급별 등록률
 *   - A/B/C/X 그룹별 등록률
 *   - 다음 작업 추천 (미등록이 많이 남은 우선 카테고리)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const dataPath = path.join(ROOT, 'src/data/materials.json');

// 분류 규칙 — phase1-build-checklist.mjs 와 동일하게 유지
const GROUP_A_CATEGORIES = new Set([
  '마루', '도배', '타일', '욕실', '주방가구', '도어', '중문',
  '일반가구', '에어컨', '실링팬', '창호',
]);
const GROUP_B_CATEGORIES = new Set([
  '몰딩', '걸레받이', '확장',
]);
const LIGHTING_PREFIXES = ['lighting_'];
const CATEGORY_ORDER = [
  '마루', '도배', '타일', '욕실', '주방가구', '조명',
  '도어', '중문', '일반가구', '에어컨', '실링팬', '창호',
  '몰딩', '걸레받이', '확장',
];

function groupOf(m) {
  const wt = m.work_type ?? '';
  const cat = m.category ?? '';
  const isLighting = LIGHTING_PREFIXES.some((p) => wt.startsWith(p));
  if (isLighting) return 'A';
  if (GROUP_A_CATEGORIES.has(cat)) return 'A';
  if (GROUP_B_CATEGORIES.has(cat)) return 'B';
  if (m.brand === '현장시공') return 'X';
  return 'C';
}

function displayCategory(m) {
  const wt = m.work_type ?? '';
  if (LIGHTING_PREFIXES.some((p) => wt.startsWith(p))) return '조명';
  return m.category ?? '(no category)';
}

function catIdx(cat) {
  const i = CATEGORY_ORDER.indexOf(cat);
  return i === -1 ? 999 : i;
}

function hasImage(m) {
  return typeof m.image_url === 'string' && m.image_url.trim().length > 0;
}

function bar(pct, width = 20) {
  const filled = Math.round((pct / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled));
}

function pctStr(done, total) {
  if (total === 0) return '  0.0%';
  return ((done / total) * 100).toFixed(1).padStart(5) + '%';
}

// === 메인 ===
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

const total = data.length;
const totalWithImg = data.filter(hasImage).length;

console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('  apt-planner — 자재 이미지 등록 현황');
console.log('═══════════════════════════════════════════════════════════');
console.log('');
console.log(`  전체:  ${String(totalWithImg).padStart(3)} / ${total} (${pctStr(totalWithImg, total).trim()})`);
console.log(`         ${bar((totalWithImg / total) * 100, 30)}`);
console.log('');

// === 그룹별 ===
const byGroup = { A: [0, 0], B: [0, 0], C: [0, 0], X: [0, 0] };
for (const m of data) {
  const g = groupOf(m);
  byGroup[g][1] += 1;
  if (hasImage(m)) byGroup[g][0] += 1;
}
console.log('─── 그룹별 ───────────────────────────────────────────────');
const groupLabels = {
  A: 'A · 시각적 필수',
  B: 'B · 보조',
  C: 'C · 사진 의미 적음',
  X: 'X · 현장시공 (불필요)',
};
for (const g of ['A', 'B', 'C', 'X']) {
  const [done, n] = byGroup[g];
  if (n === 0) continue;
  console.log(`  ${groupLabels[g].padEnd(24)} ${String(done).padStart(3)} / ${String(n).padStart(3)}  ${bar((done / n) * 100, 16)} ${pctStr(done, n)}`);
}
console.log('');

// === 카테고리별 (A+B 그룹만) ===
const byCat = new Map();
for (const m of data) {
  const g = groupOf(m);
  if (g !== 'A' && g !== 'B') continue;
  const cat = displayCategory(m);
  if (!byCat.has(cat)) byCat.set(cat, [0, 0]);
  const arr = byCat.get(cat);
  arr[1] += 1;
  if (hasImage(m)) arr[0] += 1;
}
console.log('─── 카테고리별 (A+B 그룹) ─────────────────────────────────');
const catEntries = Array.from(byCat.entries()).sort((a, b) => catIdx(a[0]) - catIdx(b[0]));
for (const [cat, [done, n]] of catEntries) {
  console.log(`  ${cat.padEnd(8)} ${String(done).padStart(3)} / ${String(n).padStart(3)}  ${bar((done / n) * 100, 16)} ${pctStr(done, n)}`);
}
console.log('');

// === 등급별 (A+B 그룹) ===
const byGrade = new Map();
for (const m of data) {
  const g = groupOf(m);
  if (g !== 'A' && g !== 'B') continue;
  const grade = m.primary_grade ?? '?';
  if (!byGrade.has(grade)) byGrade.set(grade, [0, 0]);
  const arr = byGrade.get(grade);
  arr[1] += 1;
  if (hasImage(m)) arr[0] += 1;
}
console.log('─── 등급별 (A+B 그룹) ─────────────────────────────────────');
const gradeOrder = ['가성비', '표준', '고급', '단일등급'];
for (const grade of gradeOrder) {
  if (!byGrade.has(grade)) continue;
  const [done, n] = byGrade.get(grade);
  console.log(`  ${grade.padEnd(8)} ${String(done).padStart(3)} / ${String(n).padStart(3)}  ${bar((done / n) * 100, 16)} ${pctStr(done, n)}`);
}
console.log('');

// === 다음 작업 추천 ===
const remaining = catEntries
  .filter(([, [done, n]]) => done < n)
  .sort((a, b) => catIdx(a[0]) - catIdx(b[0]));
if (remaining.length === 0) {
  console.log('🎉 A+B 그룹 모든 자재의 이미지 등록이 완료되었습니다!');
} else {
  console.log('─── 다음 작업 추천 (우선순위 순) ──────────────────────────');
  for (const [cat, [done, n]] of remaining.slice(0, 5)) {
    console.log(`  · ${cat}: ${n - done}개 남음 (${cat === '마루' ? '시각 효과 최상' : cat === '도배' ? '시각 효과 매우 큼' : ''})`);
  }
  console.log('');
  console.log('  체크리스트: docs/phase1-material-images-checklist.csv');
  console.log('  작업 가이드: docs/phase1-image-registration-guide.md');
}
console.log('');
