import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { isValidAdminToken, unauthorized } from '@/lib/admin-auth';

/**
 * 관리자 이미지 업로드 API.
 *
 * POST /api/admin/upload-image
 *   Headers: x-admin-token
 *   Body:    FormData with field "file" + optional "material_id" (파일명 prefix용)
 *
 * 응답:
 *   { ok: true, url: "https://...public.blob.vercel-storage.com/...", size: number }
 *
 * 동작:
 *  - BLOB_READ_WRITE_TOKEN 필요 (Vercel 대시보드 → Storage → Blob 연결 시 자동 주입)
 *  - 파일을 Vercel Blob 에 public access 로 업로드
 *  - 자재 ID 가 있으면 `materials/{material_id}-{random}.{ext}` 형태로 저장
 *  - 동일 ID 로 재업로드 시 새 random suffix 가 붙어 캐시 이슈 회피
 *
 * 제한:
 *  - 단일 파일 4.5 MB (Vercel Server Function body 한도). 더 큰 파일은 client upload 패턴 필요.
 *  - 자재 사진은 보통 0.5~1.5 MB 이므로 문제 없음.
 *
 * 보안: ADMIN_PASSWORD 인증 필수. 익명 업로드 차단.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // 업로드 처리 최대 30초

// 허용 MIME 타입 (자재 사진)
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
]);

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB (Vercel 한도 여유분)

export async function POST(req: Request) {
  const token = req.headers.get('x-admin-token');
  if (!isValidAdminToken(token)) return unauthorized();

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        ok: false,
        error: 'blob_not_configured',
        message: 'Vercel Blob 이 설정되지 않았습니다. 대시보드 → Storage → Blob 을 먼저 연결하세요.',
      },
      { status: 500 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_formdata' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'no_file' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_type', detail: `허용 MIME: ${Array.from(ALLOWED_TYPES).join(', ')}` },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: 'too_large', detail: `최대 ${MAX_BYTES / 1024 / 1024} MB` },
      { status: 400 },
    );
  }

  // 파일명 생성 — material_id 가 있으면 prefix 로 식별 가능하게
  const materialId = String(formData.get('material_id') ?? '').trim();
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const slug = materialId
    ? `${materialId.replace(/[^a-zA-Z0-9_-]/g, '-')}`
    : 'image';
  const filename = `materials/${slug}.${ext}`;

  try {
    // addRandomSuffix:true 면 같은 자재 재업로드해도 캐시 이슈 없이 새 URL 생성
    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: true,
      contentType: file.type,
    });
    return NextResponse.json({
      ok: true,
      url: blob.url,
      pathname: blob.pathname,
      size: file.size,
      content_type: file.type,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: 'upload_failed', detail: String(e) },
      { status: 500 },
    );
  }
}
