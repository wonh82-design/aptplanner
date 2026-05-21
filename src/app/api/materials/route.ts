import { NextResponse } from 'next/server';
import { getMaterials, fetchMaterialsUpdatedAt, isDbConfigured } from '@/lib/db';

/**
 * Public 자재 조회 API.
 *
 * - GET /api/materials → { materials: Material[], updated_at: string | null, source: 'db' | 'bundle' }
 * - DB 설정 + row 존재 시: DB 우선
 * - 그 외: bundled materials.json (빌드타임 seed)
 *
 * 캐시 정책: 항상 최신 (no-store). 자재 변경이 즉시 반영되도록.
 * 호출 빈도가 낮으므로 (페이지 부팅 시 1회) 부하 영향 미미.
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const materials = await getMaterials();
  const updatedAt = isDbConfigured() ? await fetchMaterialsUpdatedAt() : null;
  return NextResponse.json(
    {
      materials,
      updated_at: updatedAt,
      source: isDbConfigured() && updatedAt ? 'db' : 'bundle',
    },
    {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
      },
    },
  );
}
