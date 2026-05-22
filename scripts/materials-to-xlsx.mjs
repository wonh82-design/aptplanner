#!/usr/bin/env node
/**
 * src/data/materials.json → data/source/materials_master.xlsx 변환.
 *
 * 사용처:
 *  - 자재마스터 엑셀이 손상되거나 처음 생성할 때 1회만 실행.
 *  - 일상 작업에서는 사용 금지 (엑셀이 truth — 이 스크립트는 역방향이라 사용자 편집 덮어쓸 위험).
 *
 * 실행:
 *   node scripts/materials-to-xlsx.mjs
 *
 * 출력:
 *   data/source/materials_master.xlsx
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// .env.local 로드 (sync 스크립트와 동일 패턴)
function loadDotEnv() {
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const [, key, rawValue] = m;
    const value = rawValue.replace(/^["']|["']$/g, '');
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadDotEnv();

const jsonPath = path.join(ROOT, 'src/data/materials.json');
const DEFAULT_XLSX = path.join(ROOT, 'data/source/materials_master.xlsx');
const outXlsx = process.env.APT_MATERIALS_XLSX || DEFAULT_XLSX;
const outDir = path.dirname(outXlsx);

// 컬럼 순서 — 엑셀에서 보기 좋은 순서로
const COLUMNS = [
  'material_id',
  'sub_category',   // 세부공종 (구 work_type — 시스템 내부 ID)
  'category',       // 대공종 (한글 분류)
  'brand',
  'product_line',
  'installer_spec',
  'unit_type',
  'material_price',
  'labor_price',
  'total_unit_price',
  'primary_grade',
  'image_url',      // Phase 1에서 추가된 필드
  'vendor_url',     // 제조사 페이지 URL (자재 카드의 ↗ 버튼)
];

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
fs.mkdirSync(outDir, { recursive: true });

// 1행: 헤더, 2행~: 자재
const rows = [COLUMNS];
for (const m of data) {
  const row = COLUMNS.map((col) => {
    const v = m[col];
    if (v === null || v === undefined) return '';
    return v;
  });
  rows.push(row);
}

const ws = XLSX.utils.aoa_to_sheet(rows);

// 컬럼 폭 설정 — 가독성 개선
const widths = [
  { wch: 14 },  // material_id
  { wch: 22 },  // sub_category
  { wch: 10 },  // category
  { wch: 14 },  // brand
  { wch: 22 },  // product_line
  { wch: 50 },  // installer_spec
  { wch: 10 },  // unit_type
  { wch: 12 },  // material_price
  { wch: 12 },  // labor_price
  { wch: 14 },  // total_unit_price
  { wch: 10 },  // primary_grade
  { wch: 48 },  // image_url
  { wch: 48 },  // vendor_url
];
ws['!cols'] = widths;

// 헤더 행 freeze (1행 고정)
ws['!freeze'] = { xSplit: 0, ySplit: 1 };

// readme 시트 추가 — 사용 안내
const readmeRows = [
  ['apt-planner 자재마스터'],
  [''],
  ['이 파일은 자재 정보의 단일 truth (single source of truth) 입니다.'],
  ['편집 후 다음 명령으로 src/data/materials.json 갱신:'],
  [''],
  ['  npm run materials:sync'],
  [''],
  ['주의사항'],
  ['- material_id 는 변경 금지 (다른 자재 참조 깨질 수 있음)'],
  ['- total_unit_price 는 material_price + labor_price 와 일치해야 함 (sync 시 검증)'],
  ['- primary_grade 7가지: 가성비 추천 / 가성비 / 표준 추천 / 표준 / 고급 추천 / 고급 / 단일등급'],
  ['  "X 추천" 자재는 그 그룹에서 견적에 자동 우선 선택되는 대표 자재 마커'],
  ['- image_url 은 구글 드라이브 공유 링크 또는 일반 https URL (자동 변환 처리)'],
  ['- vendor_url 은 제조사 제품 페이지 URL — 자재 카드의 ↗ 버튼이 새 창으로 엶'],
  [''],
  ['신규 자재 추가 시'],
  ['1. 마지막 행 다음 빈 행에 입력'],
  ['2. material_id 는 MAT-{카테고리코드}-{번호} 형식 권장 (예: MAT-FL-014)'],
  ['3. npm run materials:sync 실행 → src/data/materials.json 갱신'],
  ['4. git diff 확인 후 커밋'],
];
const wsReadme = XLSX.utils.aoa_to_sheet(readmeRows);
wsReadme['!cols'] = [{ wch: 90 }];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, '자재마스터');
XLSX.utils.book_append_sheet(wb, wsReadme, 'README');

const out = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
fs.writeFileSync(outXlsx, out);

const display = outXlsx.startsWith(ROOT) ? path.relative(ROOT, outXlsx) : outXlsx;
console.log(`✓ 자재마스터 엑셀 생성: ${display}`);
console.log(`  - 자재 ${data.length}개`);
console.log(`  - 컬럼 ${COLUMNS.length}개`);
console.log('');
console.log('이후 자재 변경은 엑셀에서 → npm run materials:sync 로 JSON 동기화');
