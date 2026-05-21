import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import type { Material } from '@/lib/types';
import { isValidAdminToken, unauthorized } from '@/lib/admin-auth';
import { isDbConfigured, getMaterials, saveMaterialsToDb } from '@/lib/db';

/**
 * 관리자 자재마스터 API.
 *
 * GET     /api/admin/materials       — 자재 전체 반환 (DB 우선, 폴백 materials.json)
 * PUT     /api/admin/materials       — body: { materials: Material[] } — 전체 교체
 *
 * 인증: 헤더 `x-admin-token` 이 `ADMIN_PASSWORD` 환경변수와 일치해야 함.
 *
 * 저장 우선순위:
 *  1. DATABASE_URL 설정 시 → Neon Postgres `materials_blob` 테이블 upsert (즉시 운영 반영)
 *     + dev 환경이면 src/data/materials.json 도 함께 갱신 (git 백업)
 *  2. DB 미설정 + dev → fs.writeFile (기존 동작)
 *  3. DB 미설정 + prod → 다운로드 응답 (Vercel read-only fs)
 *
 * 검증:
 *  - material_id 중복 X
 *  - primary_grade 유효 값 (가성비/표준/고급/단일등급)
 *  - total_unit_price = material_price + labor_price (±1원)
 */

const VALID_GRADES = new Set(['가성비', '표준', '고급', '단일등급']);
const MATERIALS_JSON = path.resolve(process.cwd(), 'src/data/materials.json');

/** 정수 가격 필드는 .0 trailing zero 보존 + Windows CRLF — 기존 파일 포맷과 호환 */
function serializeMaterials(materials: Material[]): string {
  const json = JSON.stringify(materials, null, 2);
  const normalized = json.replace(
    /("(?:material_price|labor_price|total_unit_price)": )(-?\d+)(,?\n)/g,
    '$1$2.0$3',
  );
  return normalized.replace(/\n/g, '\r\n');
}

function validateMaterials(arr: unknown): { ok: true; data: Material[] } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!Array.isArray(arr)) return { ok: false, errors: ['materials must be array'] };
  const seen = new Set<string>();
  const cleaned: Material[] = [];
  arr.forEach((raw, idx) => {
    if (!raw || typeof raw !== 'object') {
      errors.push(`행 ${idx + 1}: 객체 아님`);
      return;
    }
    const m = raw as Record<string, unknown>;
    const id = String(m.material_id ?? '').trim();
    if (!id) { errors.push(`행 ${idx + 1}: material_id 누락`); return; }
    if (seen.has(id)) { errors.push(`행 ${idx + 1} (${id}): material_id 중복`); return; }
    seen.add(id);
    const grade = String(m.primary_grade ?? '').trim();
    if (!VALID_GRADES.has(grade)) {
      errors.push(`행 ${idx + 1} (${id}): primary_grade "${grade}" 유효하지 않음`);
    }
    const matPrice = Number(m.material_price);
    const labPrice = Number(m.labor_price);
    const total = Number(m.total_unit_price);
    if (!Number.isFinite(matPrice) || !Number.isFinite(labPrice) || !Number.isFinite(total)) {
      errors.push(`행 ${idx + 1} (${id}): 가격 필드에 숫자 아닌 값`);
    } else if (Math.abs(total - (matPrice + labPrice)) > 1) {
      errors.push(`행 ${idx + 1} (${id}): total ${total} ≠ material(${matPrice}) + labor(${labPrice})`);
    }
    // tags 정규화
    let tags: string[] = [];
    if (Array.isArray(m.tags)) tags = (m.tags as unknown[]).map(String);
    else if (typeof m.tags === 'string') tags = (m.tags as string).split(',').map((t) => t.trim()).filter(Boolean);

    const nullable = (v: unknown): string | null => {
      if (v === null || v === undefined) return null;
      const s = String(v).trim();
      return s === '' ? null : s;
    };

    // lookup_key 빈 칸 자동 생성
    let lookupKey = String(m.lookup_key ?? '').trim();
    if (!lookupKey && m.work_type && grade) {
      lookupKey = `${String(m.work_type)}|${grade}`;
    }

    // image_url 정규화
    let imageUrl: string | undefined;
    if (typeof m.image_url === 'string' && m.image_url.trim()) {
      imageUrl = m.image_url.trim();
    }

    // vendor_url 정규화 (제조사 페이지)
    let vendorUrl: string | undefined;
    if (typeof m.vendor_url === 'string' && m.vendor_url.trim()) {
      vendorUrl = m.vendor_url.trim();
    }

    const cleaned_row: Material = {
      material_id: id,
      work_type: String(m.work_type ?? '').trim(),
      category: nullable(m.category),
      sub_category: nullable(m.sub_category),
      brand: nullable(m.brand),
      product_line: nullable(m.product_line),
      installer_spec: nullable(m.installer_spec),
      tags,
      unit_type: String(m.unit_type ?? '').trim(),
      material_price: Number.isFinite(matPrice) ? matPrice : 0,
      labor_price: Number.isFinite(labPrice) ? labPrice : 0,
      total_unit_price: Number.isFinite(total) ? total : 0,
      primary_grade: VALID_GRADES.has(grade) ? grade as Material['primary_grade'] : '표준',
      lookup_key: lookupKey || null,
      secondary_key: nullable(m.secondary_key),
      ...(imageUrl ? { image_url: imageUrl } : {}),
      ...(vendorUrl ? { vendor_url: vendorUrl } : {}),
    };
    cleaned.push(cleaned_row);
  });
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data: cleaned };
}

// ===== GET — 현재 자재 반환 =====
// DB 설정 시: DB 우선 → 폴백 bundled JSON
// DB 미설정 시: 로컬 materials.json 직접 읽기 (기존 동작)
export async function GET(req: Request) {
  const token = req.headers.get('x-admin-token');
  if (!isValidAdminToken(token)) return unauthorized();
  try {
    if (isDbConfigured()) {
      const materials = await getMaterials();
      return NextResponse.json({ ok: true, materials, source: 'db' });
    }
    const raw = fs.readFileSync(MATERIALS_JSON, 'utf-8');
    const data = JSON.parse(raw);
    return NextResponse.json({ ok: true, materials: data, source: 'file' });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'read_failed', detail: String(e) }, { status: 500 });
  }
}

// ===== PUT — 전체 교체 =====
// 저장 전략:
//   1. DB 설정 시:
//      → DB upsert (즉시 운영 반영)
//      → 추가로 dev 환경이면 src/data/materials.json 도 동기화 (git 백업)
//   2. DB 미설정 시 (기존 폴백):
//      → dev: 파일 쓰기
//      → prod: 다운로드 응답 (Vercel read-only fs)
export async function PUT(req: Request) {
  const token = req.headers.get('x-admin-token');
  if (!isValidAdminToken(token)) return unauthorized();

  let body: { materials?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 }); }

  const result = validateMaterials(body.materials);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: 'validation_failed', errors: result.errors }, { status: 400 });
  }

  const serialized = serializeMaterials(result.data);
  const isDev = process.env.NODE_ENV !== 'production';

  // ── 1. DB 우선 저장 ──
  if (isDbConfigured()) {
    try {
      await saveMaterialsToDb(result.data);
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: 'db_write_failed', detail: String(e) },
        { status: 500 },
      );
    }

    // dev 환경이면 로컬 JSON 도 함께 갱신 (git diff 로 변경 이력 추적 가능)
    let fileWritten = false;
    if (isDev) {
      try {
        try { fs.copyFileSync(MATERIALS_JSON, MATERIALS_JSON + '.bak'); } catch { /* ignore */ }
        fs.writeFileSync(MATERIALS_JSON, serialized, 'utf-8');
        fileWritten = true;
      } catch {
        // 파일 쓰기 실패해도 DB 는 이미 저장됨 — 치명적이지 않음
      }
    }

    return NextResponse.json({
      ok: true,
      mode: 'db_saved',
      count: result.data.length,
      file_written: fileWritten,
      message: fileWritten
        ? '저장 완료. DB 와 로컬 materials.json 모두 갱신됨. 다음 페이지 로드부터 즉시 반영.'
        : '저장 완료. DB 에 즉시 반영됨.',
    });
  }

  // ── 2. DB 미설정 → 기존 폴백 ──
  if (isDev) {
    try {
      try { fs.copyFileSync(MATERIALS_JSON, MATERIALS_JSON + '.bak'); } catch { /* ignore */ }
      fs.writeFileSync(MATERIALS_JSON, serialized, 'utf-8');
      return NextResponse.json({
        ok: true,
        mode: 'file_written',
        count: result.data.length,
        message: 'src/data/materials.json 갱신 완료. 다음 빌드/Hot reload부터 반영됩니다.',
      });
    } catch (e) {
      return NextResponse.json({ ok: false, error: 'write_failed', detail: String(e) }, { status: 500 });
    }
  }

  // Production + DB 미설정 — 다운로드 폴백 유지 (DB 도입 전 호환)
  return NextResponse.json({
    ok: true,
    mode: 'download_required',
    count: result.data.length,
    json: serialized,
    message: 'DB 가 설정되지 않은 production 환경입니다. 반환된 JSON 을 다운로드해서 src/data/materials.json 에 교체하거나, DATABASE_URL 환경변수를 설정하세요.',
  });
}
