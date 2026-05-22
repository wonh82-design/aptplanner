#!/usr/bin/env node
/**
 * 자재마스터 엑셀 → src/data/materials.json 동기화.
 *
 *  단일 truth: data/source/materials_master.xlsx
 *  build artifact: src/data/materials.json
 *
 * 워크플로:
 *   1) 엑셀에서 자재 추가/수정/삭제
 *   2) npm run materials:sync   (이 스크립트 실행)
 *   3) git diff 확인 후 커밋
 *
 * 검증 (엄격):
 *   - 필수 컬럼 누락 → 에러
 *   - material_id 중복 → 에러
 *   - primary_grade 유효 값(가성비/표준/고급/단일등급) → 에러
 *   - total_unit_price = material_price + labor_price → 에러 (±1원 허용)
 *   - tags 문자열 콤마 분리 → 배열
 *
 * 참고: 엑셀에 lookup_key / secondary_key 컬럼이 있어도 무시됨 (deprecated).
 *       work_type + primary_grade + sub_category 에서 동적으로 계산 가능한 중복 필드라 제거됨.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/**
 * .env.local 을 직접 파싱 (dotenv 의존성 없이) — APT_MATERIALS_XLSX 변수 로드.
 * 운영자가 자기 PC 경로(예: 외부 클라우드 폴더, OneDrive 등)를 자재 엑셀로 지정.
 */
function loadDotEnv() {
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const [, key, rawValue] = m;
    // 양끝 따옴표 제거
    const value = rawValue.replace(/^["']|["']$/g, '');
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadDotEnv();

/**
 * 자재마스터 엑셀 경로 결정.
 * 우선순위: APT_MATERIALS_XLSX (절대 경로) > 기본 (data/source/materials_master.xlsx)
 */
const DEFAULT_XLSX = path.join(ROOT, 'data/source/materials_master.xlsx');
const xlsxPath = process.env.APT_MATERIALS_XLSX || DEFAULT_XLSX;
const jsonPath = path.join(ROOT, 'src/data/materials.json');

const VALID_GRADES = new Set(['가성비', '표준', '고급', '단일등급']);
const REQUIRED_COLUMNS = [
  'material_id', 'work_type', 'unit_type', 'primary_grade',
  'material_price', 'labor_price', 'total_unit_price',
];

if (!fs.existsSync(xlsxPath)) {
  console.error('❌ 자재마스터 엑셀이 없습니다:');
  console.error('   경로: ' + xlsxPath);
  console.error('');
  if (process.env.APT_MATERIALS_XLSX) {
    console.error('   .env.local 또는 환경변수 APT_MATERIALS_XLSX 가 지정한 경로에 파일이 없습니다.');
    console.error('   경로를 확인하거나 변수를 수정하세요.');
  } else {
    console.error('   기본 경로(data/source/materials_master.xlsx)에 파일이 없습니다.');
    console.error('   외부 폴더에 자재 엑셀이 있다면 .env.local 에 경로를 등록:');
    console.error('     APT_MATERIALS_XLSX="C:\\\\Users\\\\user\\\\Documents\\\\...\\\\materials_master.xlsx"');
    console.error('   또는 초기 export 실행: node scripts/materials-to-xlsx.mjs');
  }
  process.exit(1);
}

const buf = fs.readFileSync(xlsxPath);
const wb = XLSX.read(buf, { type: 'buffer', cellDates: false });
const sheetName = wb.SheetNames.includes('자재마스터')
  ? '자재마스터'
  : wb.SheetNames[0];
const ws = wb.Sheets[sheetName];

if (!ws) {
  console.error('❌ 자재마스터 시트를 찾을 수 없습니다.');
  process.exit(1);
}

// 시트를 객체 배열로 변환 (헤더는 첫 행)
const rows = XLSX.utils.sheet_to_json(ws, { defval: null });

if (rows.length === 0) {
  console.error('❌ 자재 행이 없습니다.');
  process.exit(1);
}

// 첫 행의 컬럼으로 필수 컬럼 체크
const cols = Object.keys(rows[0]);
const missingCols = REQUIRED_COLUMNS.filter((c) => !cols.includes(c));
if (missingCols.length > 0) {
  console.error('❌ 필수 컬럼 누락:', missingCols.join(', '));
  process.exit(1);
}

const errors = [];
const seenIds = new Set();
const materials = [];

rows.forEach((r, idx) => {
  const rowNum = idx + 2; // 엑셀 행 번호 (헤더가 1행)
  const id = String(r.material_id ?? '').trim();

  if (!id) {
    errors.push(`행 ${rowNum}: material_id 누락`);
    return;
  }
  if (seenIds.has(id)) {
    errors.push(`행 ${rowNum}: material_id 중복 "${id}"`);
    return;
  }
  seenIds.add(id);

  const wt = String(r.work_type ?? '').trim();
  if (!wt) errors.push(`행 ${rowNum} (${id}): work_type 누락`);

  const grade = String(r.primary_grade ?? '').trim();
  if (!VALID_GRADES.has(grade)) {
    errors.push(`행 ${rowNum} (${id}): primary_grade "${grade}" 유효하지 않음 (가성비/표준/고급/단일등급)`);
  }

  const matPrice = Number(r.material_price);
  const labPrice = Number(r.labor_price);
  const total = Number(r.total_unit_price);

  if (!Number.isFinite(matPrice)) errors.push(`행 ${rowNum} (${id}): material_price 숫자 아님 (${r.material_price})`);
  if (!Number.isFinite(labPrice)) errors.push(`행 ${rowNum} (${id}): labor_price 숫자 아님 (${r.labor_price})`);
  if (!Number.isFinite(total)) errors.push(`행 ${rowNum} (${id}): total_unit_price 숫자 아님 (${r.total_unit_price})`);

  if (Number.isFinite(matPrice) && Number.isFinite(labPrice) && Number.isFinite(total)) {
    const expected = matPrice + labPrice;
    if (Math.abs(total - expected) > 1) {
      errors.push(`행 ${rowNum} (${id}): total_unit_price ${total} ≠ material(${matPrice}) + labor(${labPrice}) = ${expected}`);
    }
  }

  // tags 콤마 분리 → 배열
  let tags = [];
  if (r.tags === null || r.tags === undefined || r.tags === '') {
    tags = [];
  } else if (Array.isArray(r.tags)) {
    tags = r.tags;
  } else {
    tags = String(r.tags).split(',').map((t) => t.trim()).filter(Boolean);
  }

  // image_url 정규화 (양끝 공백 제거)
  let imageUrl = r.image_url;
  if (typeof imageUrl === 'string') {
    imageUrl = imageUrl.trim();
    if (!imageUrl) imageUrl = null;
  } else {
    imageUrl = null;
  }

  // vendor_url 정규화 (양끝 공백 제거)
  let vendorUrl = r.vendor_url;
  if (typeof vendorUrl === 'string') {
    vendorUrl = vendorUrl.trim();
    if (!vendorUrl) vendorUrl = null;
  } else {
    vendorUrl = null;
  }

  // null→null, 빈 문자열도 null로 통일
  const nullable = (v) => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    return s === '' ? null : s;
  };

  materials.push({
    material_id: id,
    work_type: wt,
    category: nullable(r.category),
    sub_category: nullable(r.sub_category),
    brand: nullable(r.brand),
    product_line: nullable(r.product_line),
    installer_spec: nullable(r.installer_spec),
    tags,
    unit_type: String(r.unit_type ?? '').trim(),
    material_price: matPrice,
    labor_price: labPrice,
    total_unit_price: total,
    primary_grade: grade,
    ...(imageUrl ? { image_url: imageUrl } : {}),
    ...(vendorUrl ? { vendor_url: vendorUrl } : {}),
  });
});

if (errors.length > 0) {
  console.error('');
  console.error(`❌ 검증 오류 ${errors.length}건 — JSON 갱신 중단:`);
  for (const e of errors) console.error('  •', e);
  process.exit(1);
}

// 기존 JSON 백업 (안전)
if (fs.existsSync(jsonPath)) {
  const backup = jsonPath + '.bak';
  fs.copyFileSync(jsonPath, backup);
}

// JSON 작성 (들여쓰기 2칸 + 후행 newline, 기존 포맷과 동일)
// 가격 필드(정수)에 .0 trailing zero 보존 + Windows CRLF 라인엔딩 — 기존 파일 포맷과 호환되어
// git diff 폭이 의미 있는 변경만 보이도록 한다 (.gitattributes의 eol 설정과도 호환).
const json = JSON.stringify(materials, null, 2);
const normalized = json.replace(
  /("(?:material_price|labor_price|total_unit_price)": )(-?\d+)(,?\n)/g,
  '$1$2.0$3',
);
const withCRLF = normalized.replace(/\n/g, '\r\n');
// 원본 포맷과 일치: 마지막 ']' 뒤에 trailing newline 없음
fs.writeFileSync(jsonPath, withCRLF, 'utf-8');

// 통계 출력
const byGrade = materials.reduce((acc, m) => ((acc[m.primary_grade] = (acc[m.primary_grade] ?? 0) + 1), acc), {});
const withImage = materials.filter((m) => m.image_url).length;

console.log('');
console.log('✓ 자재마스터 동기화 완료');
// 외부 경로면 절대 경로 그대로, repo 내 경로면 상대 경로로 표시
const xlsxDisplay = xlsxPath.startsWith(ROOT) ? path.relative(ROOT, xlsxPath) : xlsxPath;
console.log(`  엑셀: ${xlsxDisplay}`);
console.log(`  → JSON: ${path.relative(ROOT, jsonPath)}`);
console.log('');
console.log(`  총 ${materials.length}개 자재`);
console.log(`  등급별: ${Object.entries(byGrade).map(([g, n]) => `${g} ${n}`).join(' / ')}`);
console.log(`  image_url 등록: ${withImage} / ${materials.length}`);
console.log('');
console.log('다음 단계: git diff src/data/materials.json 으로 변경 확인 후 커밋');
