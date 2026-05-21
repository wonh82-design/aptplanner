#!/usr/bin/env node
/**
 * materials:db:migrate — src/data/materials.json → Neon Postgres `materials_blob`
 *
 * 사용:
 *   1. .env.local 또는 환경에 DATABASE_URL (또는 POSTGRES_URL) 설정
 *   2. npm run materials:db:migrate
 *
 * 동작:
 *   - DB 연결 확인
 *   - materials_blob 테이블 생성 (없으면)
 *   - src/data/materials.json 읽어서 단일 row(id=1) 로 upsert
 *   - 결과 출력
 *
 * 멱등 — 여러 번 실행해도 안전. 마지막 실행 내용이 그대로 반영.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── .env.local 파싱 (dotenv 의존성 회피) ──
function loadEnvLocal() {
  try {
    const envPath = path.join(ROOT, '.env.local');
    const text = readFileSync(envPath, 'utf-8');
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2];
      // 양 끝 따옴표 제거
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env.local 없어도 OK — 환경변수에서 직접 읽음
  }
}
loadEnvLocal();

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL 환경변수가 설정되지 않았습니다.');
  console.error('   .env.local 또는 시스템 환경변수에 DATABASE_URL 을 추가하세요.');
  console.error('   (Vercel 대시보드 → Storage → Neon DB 생성 → .env.local 에 자동 추가됨)');
  process.exit(1);
}

const { neon } = await import('@neondatabase/serverless');
const sql = neon(connectionString);

console.log('🔗 DB 연결 확인 중...');
try {
  const result = await sql`SELECT 1 as ok`;
  if (!result[0]?.ok) throw new Error('connection check failed');
  console.log('✅ DB 연결 OK');
} catch (e) {
  console.error('❌ DB 연결 실패:', e.message || e);
  process.exit(1);
}

console.log('📋 materials_blob 테이블 확인/생성...');
await sql`
  CREATE TABLE IF NOT EXISTS materials_blob (
    id INT PRIMARY KEY DEFAULT 1,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT singleton CHECK (id = 1)
  )
`;
console.log('✅ 테이블 OK');

const jsonPath = path.join(ROOT, 'src/data/materials.json');
const raw = readFileSync(jsonPath, 'utf-8');
const materials = JSON.parse(raw);
console.log(`📦 src/data/materials.json 로드: ${materials.length} 개 자재`);

console.log('💾 DB 에 저장 중...');
await sql`
  INSERT INTO materials_blob (id, data, updated_at)
  VALUES (1, ${JSON.stringify(materials)}::jsonb, NOW())
  ON CONFLICT (id) DO UPDATE
    SET data = EXCLUDED.data,
        updated_at = NOW()
`;

// 검증 — 다시 읽어서 개수 확인
const rows = await sql`SELECT jsonb_array_length(data) AS cnt, updated_at FROM materials_blob WHERE id = 1`;
const dbCount = rows[0]?.cnt;
const dbUpdatedAt = rows[0]?.updated_at;

if (dbCount === materials.length) {
  console.log(`✅ 저장 완료: ${dbCount} 개 자재 (updated_at = ${dbUpdatedAt})`);
  process.exit(0);
} else {
  console.error(`❌ 검증 실패: 원본 ${materials.length} 개, DB ${dbCount} 개`);
  process.exit(1);
}
