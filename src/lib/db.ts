/**
 * Neon Postgres 데이터베이스 클라이언트.
 *
 * 자재마스터를 단일 row JSONB 로 저장. 운영자가 /admin/materials 에서 편집 시
 * 즉시 DB에 반영되고, 다음 페이지 로드부터 모든 사용자에게 노출.
 *
 * 환경:
 *  - DATABASE_URL (또는 POSTGRES_URL) 환경변수 설정 시 → DB 사용
 *  - 미설정 시 → src/data/materials.json (bundled) 사용 (로컬 dev 폴백)
 *
 * 스키마: materials_blob (singleton row, id=1)
 *   { id INT PK CHECK(id=1), data JSONB NOT NULL, updated_at TIMESTAMPTZ }
 *
 * 단일 row JSONB 패턴을 쓰는 이유:
 *  - 자재 224개 ≈ 100KB, 한 트랜잭션 부담 없음
 *  - 운영자가 1명이라 동시 편집 충돌 없음
 *  - 마이그레이션·검증·롤백이 1 row 만 보면 됨
 *  - row-per-material CRUD 보다 훨씬 단순 (현재 ALL_MATERIALS 배열 흐름과 일치)
 */
import { neon } from '@neondatabase/serverless';
import type { Material } from './types';
import bundledMaterials from '@/data/materials.json';

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  '';

const sql = connectionString ? neon(connectionString) : null;

export function isDbConfigured(): boolean {
  return sql !== null;
}

/** 테이블 생성 (idempotent). 처음 실행 시 1회 호출하면 충분. */
export async function ensureMaterialsTable(): Promise<void> {
  if (!sql) throw new Error('DATABASE_URL not configured');
  await sql`
    CREATE TABLE IF NOT EXISTS materials_blob (
      id INT PRIMARY KEY DEFAULT 1,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT singleton CHECK (id = 1)
    )
  `;
}

/** DB에서 자재 배열을 읽어옴. row 없으면 null. */
export async function fetchMaterialsFromDb(): Promise<Material[] | null> {
  if (!sql) return null;
  try {
    const rows = (await sql`SELECT data FROM materials_blob WHERE id = 1`) as Array<{ data: Material[] }>;
    if (rows.length === 0) return null;
    return rows[0].data;
  } catch (e) {
    // 테이블이 아직 없을 수 있음 — 호출 측에서 폴백 처리
    console.error('[db] fetchMaterialsFromDb error:', e);
    return null;
  }
}

/** 자재 배열 전체를 DB에 저장 (upsert). */
export async function saveMaterialsToDb(materials: Material[]): Promise<void> {
  if (!sql) throw new Error('DATABASE_URL not configured');
  await ensureMaterialsTable();
  const payload = JSON.stringify(materials);
  await sql`
    INSERT INTO materials_blob (id, data, updated_at)
    VALUES (1, ${payload}::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE
      SET data = EXCLUDED.data,
          updated_at = NOW()
  `;
}

/**
 * 자재마스터 단일 조회 (서버 사이드).
 * DB 설정돼 있고 row 있으면 DB → 그 외엔 bundled JSON.
 */
export async function getMaterials(): Promise<Material[]> {
  if (sql) {
    const fromDb = await fetchMaterialsFromDb();
    if (fromDb && fromDb.length > 0) return fromDb;
  }
  return bundledMaterials as Material[];
}

// ===== '우리집 인테리어 계획서' 신청 영속화 =====
// 이메일(Resend)이 유일 채널일 때의 무음 유실을 방지하는 내구 저장소.
// 이메일 발송 성공/실패와 무관하게 신청을 보존 → 관리자가 후속 처리 가능.

/** plan_requests 테이블 생성 (idempotent) */
export async function ensurePlanRequestsTable(): Promise<void> {
  if (!sql) throw new Error('DATABASE_URL not configured');
  await sql`
    CREATE TABLE IF NOT EXISTS plan_requests (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      meta JSONB,
      quote JSONB,
      has_pdf BOOLEAN NOT NULL DEFAULT FALSE,
      emailed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

/**
 * 신청 1건 저장. 성공 시 true (주문 보존됨), DB 미설정/실패 시 false.
 * quote 전체를 저장해 관리자가 산정 내역을 재생성할 수 있게 한다.
 */
export async function savePlanRequest(rec: {
  name: string;
  email: string;
  meta?: unknown;
  quote?: unknown;
  hasPdf?: boolean;
  emailed?: boolean;
}): Promise<boolean> {
  if (!sql) return false;
  try {
    await ensurePlanRequestsTable();
    await sql`
      INSERT INTO plan_requests (name, email, meta, quote, has_pdf, emailed)
      VALUES (
        ${rec.name},
        ${rec.email},
        ${JSON.stringify(rec.meta ?? null)}::jsonb,
        ${JSON.stringify(rec.quote ?? null)}::jsonb,
        ${!!rec.hasPdf},
        ${!!rec.emailed}
      )
    `;
    return true;
  } catch (e) {
    console.error('[db] savePlanRequest error:', e);
    return false;
  }
}

/** DB가 마지막으로 업데이트된 시각 (캐시 무효화용). 없으면 null. */
export async function fetchMaterialsUpdatedAt(): Promise<string | null> {
  if (!sql) return null;
  try {
    const rows = (await sql`SELECT updated_at FROM materials_blob WHERE id = 1`) as Array<{ updated_at: string }>;
    if (rows.length === 0) return null;
    return rows[0].updated_at;
  } catch {
    return null;
  }
}
