# Neon Postgres 설정 가이드

자재마스터를 웹에서 편집하면 **즉시 운영에 반영**되도록 Neon Postgres 를 연결하는 절차.

미설정 시에도 앱은 동작하지만(`src/data/materials.json` 폴백), 운영 환경에서 admin 저장이 즉시 반영되지 않고 JSON 다운로드 → git commit 의 수동 단계를 거쳐야 함.

## 1. Vercel 대시보드에서 Neon 연결

1. https://vercel.com → apt-planner 프로젝트
2. **Storage** 탭 → **Create Database**
3. **Marketplace** → **Neon** 선택 (구 Vercel Postgres 는 deprecated)
4. 지역: **Asia Pacific (Singapore) ap-southeast-1** 권장 (한국에서 가장 가까움)
5. 플랜: **Free** (10GB 충분, 자재 100KB 수준)
6. 프로젝트 연결 → 자동으로 다음 env vars 가 Vercel project 에 주입됨:
   - `DATABASE_URL`
   - `DATABASE_URL_UNPOOLED`
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - … (앱은 `DATABASE_URL` 우선 사용)

## 2. 로컬 `.env.local` 동기화

### 옵션 A — Vercel CLI 로 자동 동기화 (권장)
```bash
npm i -g vercel
vercel login
vercel link            # 대화형으로 프로젝트 선택
vercel env pull .env.local
```
`.env.local` 에 `DATABASE_URL` 등이 자동 추가됨.

### 옵션 B — 수동 복사
1. Vercel 대시보드 → 프로젝트 → **Settings** → **Environment Variables**
2. `DATABASE_URL` 값 복사
3. 로컬 `.env.local` 에 추가:
   ```
   DATABASE_URL=postgres://...
   ```

## 3. 초기 마이그레이션 — 기존 JSON → DB

```bash
npm run materials:db:migrate
```

출력 예시:
```
🔗 DB 연결 확인 중...
✅ DB 연결 OK
📋 materials_blob 테이블 확인/생성...
✅ 테이블 OK
📦 src/data/materials.json 로드: 224 개 자재
💾 DB 에 저장 중...
✅ 저장 완료: 224 개 자재 (updated_at = 2026-05-22T...)
```

이 단계로 현재 `src/data/materials.json` 의 자재 224개가 DB 에 적재됨.

## 4. 검증

### 로컬
```bash
npm run dev
# http://localhost:3000/calc 접속
# Network 탭에서 /api/materials 응답이 { source: "db", ... } 로 오는지 확인
```

### 운영
1. 코드를 GitHub 에 push → Vercel 자동 배포
2. 운영 사이트의 `/admin/materials` 진입
3. 임의 자재의 가격을 수정 후 저장
4. **다른 탭에서** `/calc` 페이지 새로고침 → 변경된 값이 보이면 성공

## 5. 운영 흐름 (DB 도입 후)

```
[운영자]  /admin/materials (Vercel 운영)
            ↓ 편집 후 저장
       /api/admin/materials PUT
            ↓
       Neon Postgres materials_blob (upsert)
            ↓ 즉시 반영
[사용자]  /calc 페이지 새로고침
       → /api/materials GET
       → MaterialsProvider 가 setMaterials() 호출
       → 모든 자재 카드·계산기가 새 값으로 동작
```

재배포 / git commit 불필요.

## 트러블슈팅

### "DATABASE_URL 환경변수가 설정되지 않았습니다" — 마이그레이션 실패
- `.env.local` 에 `DATABASE_URL=postgres://...` 가 정확히 있는지 확인
- Vercel CLI 로 동기화: `vercel env pull .env.local`
- 셸 재시작 (npm 이 새 env 를 읽도록)

### `/api/materials` 응답이 `source: "bundle"` — DB 가 사용되지 않음
- Vercel 운영: Settings → Environment Variables 에 `DATABASE_URL` 이 **Production** 환경에 설정됐는지 확인
- 로컬 dev: `.env.local` 의 변수가 next dev 재시작 후 반영됐는지 확인

### admin 저장이 즉시 반영되지 않음
- `source: "db"` 확인 (위 항목)
- 사용자 페이지가 **새로고침** 되었는지 확인 (MaterialsProvider 는 페이지 마운트 시 1회 fetch)
- 캐시: 브라우저 강제 새로고침 (Ctrl+Shift+R)

### 비용
- Neon Free 플랜: 0.5GB storage, 100시간 compute/month
- 자재 ~100KB + 부팅 시 1 SELECT 쿼리 → 수년 사용 가능
- 트래픽이 늘면 자동으로 Hobby ($19/mo) 또는 Launch ($69/mo) 안내

## 백업 전략

- DB 데이터는 자동 백업되지 않으므로 정기적으로 `src/data/materials.json` 을 git 에 commit 해서 source-of-truth 사본 유지 권장
- 로컬 dev 환경에선 admin 저장 시 DB + JSON 양쪽 갱신되므로 git diff 로 자연스럽게 변경 이력 추적
- 운영(prod)에선 admin 저장이 DB only — 주기적으로 admin GET 응답을 다운받아 JSON 파일과 git commit 권장
