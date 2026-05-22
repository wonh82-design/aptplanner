#!/usr/bin/env node
/**
 * images:migrate-to-blob — 기존 image_url (Google Drive 등) 의 이미지를
 *                          fetch 해서 Vercel Blob 에 업로드하고, DB·JSON 의 URL 교체.
 *
 * 동작:
 *   1. DATABASE_URL + BLOB_READ_WRITE_TOKEN 환경변수 확인
 *   2. Neon DB 의 materials_blob 또는 로컬 materials.json 에서 자재 로드
 *   3. image_url 이 있고 *.public.blob.vercel-storage.com 이 아닌 자재만 대상
 *   4. 각 자재:
 *      a) image_url 이 drive.google.com 이면 normalizeImageUrl() 로 thumbnail URL 변환
 *      b) fetch 로 바이트 받아옴
 *      c) Blob 에 put(`materials/{material_id}.{ext}`, body, { access:'public' })
 *      d) 자재의 image_url 을 새 Blob URL 로 교체
 *   5. 변경된 materials 배열을 DB + JSON 양쪽 저장
 *
 * 안전성:
 *   - 자재별로 try/catch — 한 자재 실패해도 나머지 계속 진행
 *   - 이미 Blob URL 인 자재는 skip
 *   - dry-run 모드 지원: --dry-run 플래그 시 실제 업로드/저장 안 함
 *
 * 사용:
 *   npm run images:migrate-to-blob          # 실제 실행
 *   npm run images:migrate-to-blob -- --dry-run    # 사전 점검
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');

// ── .env.local 파싱 ──
function loadEnvLocal() {
  try {
    const text = readFileSync(path.join(ROOT, '.env.local'), 'utf-8');
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let val = m[2];
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  } catch { /* ignore */ }
}
loadEnvLocal();

const databaseUrl =
  process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

if (!blobToken) {
  console.error('❌ BLOB_READ_WRITE_TOKEN 이 설정되지 않았습니다.');
  console.error('   Vercel 대시보드 → Storage → Blob 생성 후 `vercel env pull .env.local` 실행하세요.');
  process.exit(1);
}

// ── Google Drive URL 정규화 (src/lib/image-utils.ts 와 동일 로직) ──
function extractDriveFileId(url) {
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]{20,})/);
  if (m1) return m1[1];
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (m2) return m2[1];
  return null;
}

function normalizeUrl(url, size = 1200) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith('https://drive.google.com/thumbnail') ||
    trimmed.startsWith('https://lh3.googleusercontent.com')
  ) {
    return trimmed;
  }
  if (trimmed.includes('drive.google.com')) {
    const id = extractDriveFileId(trimmed);
    if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w${size}`;
  }
  return trimmed;
}

function isBlobUrl(url) {
  return typeof url === 'string' && /\.public\.blob\.vercel-storage\.com/.test(url);
}

// ── 자재 로드 ──
let materials = [];
let loadedFrom = '';

if (databaseUrl) {
  console.log('🔗 Neon DB 에서 자재 로드 중...');
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(databaseUrl);
  const rows = await sql`SELECT data FROM materials_blob WHERE id = 1`;
  if (rows.length === 0) {
    console.error('❌ DB 에 materials_blob row 없음. npm run materials:db:migrate 먼저 실행하세요.');
    process.exit(1);
  }
  materials = rows[0].data;
  loadedFrom = 'db';
} else {
  console.log('🔗 로컬 materials.json 에서 자재 로드 중...');
  materials = JSON.parse(readFileSync(path.join(ROOT, 'src/data/materials.json'), 'utf-8'));
  loadedFrom = 'file';
}
console.log(`✅ ${materials.length} 개 자재 로드 (source: ${loadedFrom})`);

// ── 마이그레이션 대상 분류 ──
const targets = [];
let skippedBlob = 0;
let skippedEmpty = 0;
for (const m of materials) {
  const url = m.image_url;
  if (!url) { skippedEmpty++; continue; }
  if (isBlobUrl(url)) { skippedBlob++; continue; }
  targets.push(m);
}

console.log('');
console.log('📊 마이그레이션 대상 분석:');
console.log(`   - 이미지 없음 (skip):       ${skippedEmpty}`);
console.log(`   - 이미 Blob URL (skip):     ${skippedBlob}`);
console.log(`   - 외부 URL → Blob 이전:    ${targets.length}`);
console.log('');

if (targets.length === 0) {
  console.log('✅ 마이그레이션할 자재 없음. 종료.');
  process.exit(0);
}

if (DRY_RUN) {
  console.log('🔍 DRY RUN — 실제 업로드/저장 안 함');
  console.log('대상 자재 목록:');
  for (const m of targets.slice(0, 20)) {
    console.log(`   ${m.material_id}  ${m.image_url}`);
  }
  if (targets.length > 20) console.log(`   ... 외 ${targets.length - 20}개`);
  console.log('');
  console.log('실제 실행: npm run images:migrate-to-blob');
  process.exit(0);
}

// ── 실제 마이그레이션 ──
const { put } = await import('@vercel/blob');

let ok = 0;
let failed = 0;
const failures = [];

for (let i = 0; i < targets.length; i++) {
  const m = targets[i];
  const progress = `[${i + 1}/${targets.length}]`;
  process.stdout.write(`${progress} ${m.material_id} ... `);

  try {
    const fetchUrl = normalizeUrl(m.image_url, 1200);
    if (!fetchUrl) throw new Error('invalid_url');

    const res = await fetch(fetchUrl, { redirect: 'follow' });
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength === 0) throw new Error('empty_body');

    const ext =
      contentType.includes('png') ? 'png' :
      contentType.includes('webp') ? 'webp' :
      contentType.includes('gif') ? 'gif' :
      'jpg';
    const filename = `materials/${m.material_id}.${ext}`;

    const blob = await put(filename, Buffer.from(buffer), {
      access: 'public',
      addRandomSuffix: true,
      contentType,
      token: blobToken,
    });

    // 자재 객체에 새 URL 반영
    const idx = materials.findIndex((x) => x.material_id === m.material_id);
    if (idx >= 0) materials[idx] = { ...materials[idx], image_url: blob.url };

    console.log(`✓ ${Math.round(buffer.byteLength / 1024)}KB → ${blob.url}`);
    ok++;
  } catch (e) {
    console.log(`✗ ${e.message || e}`);
    failures.push({ material_id: m.material_id, url: m.image_url, error: String(e.message || e) });
    failed++;
  }
}

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`결과: 성공 ${ok}, 실패 ${failed}`);

if (failed > 0) {
  console.log('');
  console.log('실패한 자재 목록:');
  for (const f of failures) {
    console.log(`   ${f.material_id}: ${f.error}`);
    console.log(`     원본 URL: ${f.url}`);
  }
  console.log('');
  console.log('💡 실패 사유 예시:');
  console.log('   - Google Drive 403: 권한 변경 또는 hotlink 차단됨');
  console.log('   - fetch 404: URL 유효하지 않음');
  console.log('   - 운영자가 admin 페이지에서 직접 새 파일 업로드로 교체 권장');
}

// ── 변경된 자재 저장 ──
// 정수 가격 .0 보존 + CRLF
function serialize(data) {
  let json = JSON.stringify(data, null, 2);
  json = json.replace(/("(?:material_price|labor_price|total_unit_price)": )(-?\d+)(,?\n)/g, '$1$2.0$3');
  return json.replace(/\n/g, '\r\n');
}

const jsonPath = path.join(ROOT, 'src/data/materials.json');
const serialized = serialize(materials);
writeFileSync(jsonPath, serialized, 'utf-8');
console.log('✅ src/data/materials.json 갱신됨');

if (databaseUrl) {
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(databaseUrl);
  await sql`
    INSERT INTO materials_blob (id, data, updated_at)
    VALUES (1, ${JSON.stringify(materials)}::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE
      SET data = EXCLUDED.data, updated_at = NOW()
  `;
  console.log('✅ Neon DB materials_blob 갱신됨');
}

console.log('');
console.log('💡 다음 단계:');
console.log('   - git diff 로 materials.json 변경 확인');
console.log('   - npm run build 로 빌드 검증');
console.log('   - 푸시 → Vercel 자동 재배포 → 운영에서 새 이미지 확인');
