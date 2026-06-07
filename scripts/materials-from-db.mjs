#!/usr/bin/env node
/**
 * materials:db:pull — Neon Postgres `materials_blob` → src/data/materials.json
 *
 * 방향: DB → JSON (역방향 동기화).
 *
 * ⚠️ 정책: 웹 DB(/admin 에서 편집한 운영 데이터)가 항상 최우선 source of truth.
 *   로컬 JSON 은 DB 의 백업/시드 미러일 뿐이다.
 *   - 이 스크립트(db:pull): DB → JSON. 운영 편집을 git 으로 가져와 백업·동기화. (안전)
 *   - 반대 방향(db:migrate, JSON → DB)은 운영 편집을 덮어쓰므로 위험 — 신중히.
 *
 * 사용:
 *   1. .env.local 에 DATABASE_URL
 *   2. npm run materials:db:pull
 *   3. git diff 로 변경 확인 후 commit (git 백업이 운영 DB 와 일치하게 유지)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── .env.local 파싱 (dotenv 의존성 회피) ──
function loadEnvLocal() {
  try {
    const text = readFileSync(path.join(ROOT, '.env.local'), 'utf-8');
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let val = m[2];
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  } catch {}
}
loadEnvLocal();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

/** API route.ts serializeMaterials 와 동일 — 정수 가격 .0 보존 + CRLF */
function serialize(arr) {
  const json = JSON.stringify(arr, null, 2);
  const normalized = json.replace(
    /("(?:material_price|labor_price|total_unit_price)": )(-?\d+)(,?\n)/g,
    '$1$2.0$3',
  );
  return normalized.replace(/\n/g, '\r\n');
}

const { neon } = await import('@neondatabase/serverless');
const sql = neon(connectionString);

console.log('🔗 DB 연결 확인...');
const rows = await sql`SELECT data, updated_at FROM materials_blob WHERE id = 1`;
if (!rows[0]?.data) {
  console.error('❌ materials_blob 에 데이터가 없습니다.');
  process.exit(1);
}
const materials = rows[0].data;
if (!Array.isArray(materials)) {
  console.error('❌ DB data 가 배열이 아닙니다.');
  process.exit(1);
}

// 중복 material_id 점검 (있으면 경고만)
const ids = materials.map((m) => m.material_id);
const dup = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];

const jsonPath = path.join(ROOT, 'src/data/materials.json');
const before = (() => { try { return JSON.parse(readFileSync(jsonPath, 'utf-8')).length; } catch { return 0; } })();

writeFileSync(jsonPath, serialize(materials), 'utf-8');

console.log(`✅ DB → JSON 동기화 완료`);
console.log(`   자재 수: ${before} → ${materials.length} (DB updated_at = ${rows[0].updated_at})`);
console.log(`   중복 material_id: ${dup.length ? '⚠ ' + dup.join(', ') : '없음'}`);
console.log(`   → git diff 로 확인 후 commit 하세요.`);
