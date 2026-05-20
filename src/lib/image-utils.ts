/**
 * 자재 이미지 URL 정규화.
 *
 * 운영자가 자재마스터(materials.json)에 구글 드라이브 공유 링크를 그대로 넣어도
 * 브라우저가 직접 표시 가능한 thumbnail URL로 자동 변환한다.
 *
 * 지원 형식:
 *  - https://drive.google.com/file/d/{FILE_ID}/view?usp=sharing  (가장 흔한 공유 링크)
 *  - https://drive.google.com/file/d/{FILE_ID}/preview
 *  - https://drive.google.com/open?id={FILE_ID}
 *  - https://drive.google.com/uc?id={FILE_ID}&export=view
 *  - 이미 변환된 형식 (drive.google.com/thumbnail, lh3.googleusercontent.com) → 그대로
 *  - 외부 일반 https URL (Cloudinary, public 폴더 등) → 그대로
 *
 * ⚠️ 한계 (구글 드라이브 호스팅):
 *  - 동일 파일 일일 트래픽 ~수만 회 초과 시 일시 차단 가능
 *  - 가끔 CORS/Hotlink 403 응답 (이미지 onError로 placeholder 처리 권장)
 *  - 첫 로딩 ~500ms~2s 지연
 *  → 트래픽 증가 시 Vercel Blob, Cloudinary, public 폴더 등으로 이전 권장
 */

/**
 * 구글 드라이브 공유 링크에서 file_id 추출.
 * 매치 실패 시 null.
 */
export function extractDriveFileId(url: string): string | null {
  // /file/d/{ID}/view 또는 /file/d/{ID}/preview 또는 /file/d/{ID}/edit
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]{20,})/);
  if (m1) return m1[1];
  // ?id={ID} 또는 &id={ID}
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (m2) return m2[1];
  return null;
}

/**
 * 자재 이미지 URL을 브라우저가 직접 표시 가능한 형식으로 변환.
 * 빈 값/null이면 null 반환 — 호출 측에서 placeholder 처리.
 *
 * @param url  Material.image_url (구글 드라이브 공유 링크 또는 외부 URL)
 * @param size 너비 px — 기본 800 (자재 모달 카드에 적합)
 */
export function normalizeImageUrl(
  url: string | null | undefined,
  size: number = 800,
): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // 이미 thumbnail/googleusercontent 형식이면 그대로
  if (
    trimmed.startsWith('https://drive.google.com/thumbnail') ||
    trimmed.startsWith('https://lh3.googleusercontent.com')
  ) {
    return trimmed;
  }

  // 구글 드라이브 링크면 file_id 추출 후 thumbnail URL 생성
  if (trimmed.includes('drive.google.com')) {
    const id = extractDriveFileId(trimmed);
    if (id) {
      return `https://drive.google.com/thumbnail?id=${id}&sz=w${size}`;
    }
  }

  // 외부 일반 URL (Cloudinary, https://example.com/foo.jpg 등) → 그대로
  return trimmed;
}

/**
 * 자재마스터에 image_url이 아직 등록되지 않은 자재에 대해 placeholder 이미지를 보여줄지 결정.
 *
 * 정책:
 *  - `NEXT_PUBLIC_DUMMY_IMAGES=1` 명시 → 항상 ON (production 포함)
 *  - `NEXT_PUBLIC_DUMMY_IMAGES=0` 명시 → 항상 OFF
 *  - 미설정 시 → development 환경에서만 자동 ON (Vercel production은 OFF)
 *
 * Phase 1 작업 중 어떻게 보이는지 미리보기용. 실제 image_url이 등록된 자재는
 * 환경 무관하게 실제 이미지를 우선 사용한다.
 */
export function shouldUseDummyImages(): boolean {
  const flag = process.env.NEXT_PUBLIC_DUMMY_IMAGES;
  if (flag === '1') return true;
  if (flag === '0') return false;
  return process.env.NODE_ENV !== 'production';
}

/**
 * 자재 ID 기반 더미 이미지 URL 생성.
 * picsum.photos는 seed가 같으면 같은 이미지를 반환 → 자재마다 다른 이미지가 일관되게 표시됨.
 *
 * @param seed  Material.material_id 또는 work_type 등 일관된 키
 * @param size  너비 px (기본 800)
 */
export function placeholderImageUrl(seed: string, size: number = 800): string {
  // seed에 허용 문자만 남김 — picsum이 안전하게 처리하도록
  const safe = (seed || 'apt-planner').replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 64);
  // 4:3 비율 (자세히 모달의 aspect-[4/3]에 맞춤)
  const h = Math.round(size * 0.75);
  return `https://picsum.photos/seed/${safe}/${size}/${h}`;
}
