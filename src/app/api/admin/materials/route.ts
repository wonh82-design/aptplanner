import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import type { Material } from '@/lib/types';
import { isValidAdminToken, unauthorized } from '@/lib/admin-auth';

/**
 * 관리자 자재마스터 API.
 *
 * GET     /api/admin/materials       — 현재 materials.json 전체 반환
 * PUT     /api/admin/materials       — body: { materials: Material[] } — 전체 교체
 *
 * 인증: 헤더 `x-admin-token` 이 `ADMIN_PASSWORD` 환경변수와 일치해야 함.
 *
 * 저장:
 *  - dev 환경 (process.env.NODE_ENV !== 'production'): fs.writeFile 로 직접 저장 → 다음 빌드부터 반영
 *  - production (Vercel read-only FS): 파일 쓰기 불가 → JSON 응답으로 반환 → 클라이언트에서 다운로드
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
    };
    cleaned.push(cleaned_row);
  });
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data: cleaned };
}

// ===== GET — 현재 materials.json 반환 =====
export async function GET(req: Request) {
  const token = req.headers.get('x-admin-token');
  if (!isValidAdminToken(token)) return unauthorized();
  try {
    const raw = fs.readFileSync(MATERIALS_JSON, 'utf-8');
    const data = JSON.parse(raw);
    return NextResponse.json({ ok: true, materials: data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'read_failed', detail: String(e) }, { status: 500 });
  }
}

// ===== PUT — 전체 교체 =====
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
  if (isDev) {
    try {
      // 백업 (안전)
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
  } else {
    // Production read-only filesystem — 클라이언트에 JSON 반환해 다운로드하도록
    return NextResponse.json({
      ok: true,
      mode: 'download_required',
      count: result.data.length,
      json: serialized,
      message: 'Production 환경에서는 파일 쓰기가 불가합니다. 반환된 JSON을 다운로드해서 src/data/materials.json 에 교체 후 git commit 하세요.',
    });
  }
}
