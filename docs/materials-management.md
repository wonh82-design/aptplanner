# 자재마스터 운영 가이드

apt-planner의 자재 정보(브랜드 / 단가 / 사양 / 이미지 URL)는 **엑셀 1개 파일**에서 관리합니다.
계산 로직은 웹(`src/lib/calculator.ts`)에서만 실행되며, 엑셀은 더 이상 계산 도구가 아닙니다.

## 데이터 흐름 (단일 truth)

```
[외부 폴더] materials_master.xlsx   ← 운영자가 편집 (단일 truth)
        │   경로는 .env.local 의 APT_MATERIALS_XLSX 변수로 지정
        │   npm run materials:sync
        ↓
src/data/materials.json             ← 자동 생성 (직접 편집 금지, git 추적)
        ↓
src/lib/calculator.ts                ← 계산 로직
        ↓
웹 앱 (https://app.apt-planner.com)
```

### 엑셀 위치 (운영자 PC)

현재 운영자(원호)의 자재마스터 위치:
```
C:\Users\user\Documents\Claude\Projects\int biz\materials_master.xlsx
```

이 경로는 `.env.local` 의 `APT_MATERIALS_XLSX` 환경변수로 지정되어 있습니다.
다른 PC나 새 운영자는 `.env.example` 을 `.env.local` 로 복사한 뒤 본인 경로로 수정.

---

## 자주 하는 작업

### 1. 자재 단가 변경

1. **파일 열기**: `C:\Users\user\Documents\Claude\Projects\int biz\materials_master.xlsx`
   (또는 `.env.local` 의 `APT_MATERIALS_XLSX` 가 가리키는 위치)
2. **시트**: `자재마스터`
3. **해당 자재 행 찾기**: material_id (예: MAT-FL-001) 또는 brand로 검색
4. **수정 컬럼**:
   - `material_price` (자재가)
   - `labor_price` (시공비)
   - `total_unit_price` (합계) — material + labor 와 일치해야 함 (sync 시 검증)
5. **저장 후**:
   ```bash
   npm run materials:sync
   ```
6. **git diff 확인**:
   ```bash
   git diff src/data/materials.json
   ```
   변경된 자재만 보이면 정상.
7. **커밋**:
   ```bash
   git add data/source/materials_master.xlsx src/data/materials.json
   git commit -m "fix(materials): MAT-FL-001 단가 ₩34K → ₩36K 갱신"
   ```

### 2. 신규 자재 추가

1. **엑셀 마지막 행 다음에 입력**
2. **material_id 규칙**: `MAT-{카테고리코드}-{번호}` (예: MAT-FL-014)
   - 카테고리 코드: FL=마루, WP=도배, TI=타일, KT=주방, BT=욕실, LT=조명, AC=에어컨, DR=도어 등
3. **필수 컬럼**:
   - `material_id`, `work_type`, `unit_type`, `primary_grade`, `material_price`, `labor_price`, `total_unit_price`
4. **자동 채워지는 컬럼** (비워둬도 sync 시 채워짐):
   - `lookup_key`: `{work_type}|{grade}` 형식으로 자동 생성
5. **tags**: 콤마 구분 문자열 (예: `"표준,주력"`)
6. **primary_grade**: `가성비` / `표준` / `고급` / `단일등급` 중 하나
7. `npm run materials:sync` → git diff → 커밋

### 3. 자재 이미지 등록 (Phase 1)

`docs/phase1-image-registration-guide.md` 참고.

1. 구글 드라이브 폴더에 이미지 업로드
2. 공유 링크 복사 (`https://drive.google.com/file/d/{ID}/view?usp=sharing`)
3. 엑셀의 `image_url` 컬럼에 붙여넣기 (어떤 형식이든 자동 변환됨)
4. `npm run materials:sync`

### 4. 자재 삭제

1. 엑셀에서 해당 행 삭제 (행 자체)
2. `npm run materials:sync` 시 자동으로 JSON에서도 제거
3. ⚠️ `material_id`가 코드 어딘가에서 참조되면 빌드 실패 가능 → 신중히

---

## sync 시 자동 검증

`npm run materials:sync` 실행 시 다음을 검증합니다:

| 검증 | 통과 조건 |
|---|---|
| 필수 컬럼 | material_id, work_type, unit_type, primary_grade, material_price, labor_price, total_unit_price 모두 존재 |
| material_id 유일성 | 같은 ID 중복 없음 |
| primary_grade | 가성비/표준/고급/단일등급 중 하나 |
| 가격 수식 | total_unit_price = material_price + labor_price (±1원) |
| 가격 숫자 | 빈 칸 / 텍스트 아님 |
| lookup_key | 빈 칸이면 자동 생성 |
| tags | 콤마 구분 문자열 → 배열 변환 |
| image_url | 양끝 공백 제거 (있으면 사용, 없으면 null) |

검증 실패 시 JSON 갱신 중단. 에러 메시지에 행 번호와 material_id 표시됨.

---

## 검증 시나리오 (regression 체크)

자재 단가 변경 후 5개 대표 시나리오의 견적 변화를 확인:

```bash
npx tsx scripts/verify-scenarios.ts
```

- `excel_grand_total` (frozen fixture, 엑셀 v5 LibreOffice 재계산값)과 웹 산출값 비교
- 차이 ±5% 이내면 정상, 그 이상이면 의도된 변경인지 확인
- 의도된 변경이라면 `scripts/scenarios-fixture.json` 의 `excel_grand_total` 값을 함께 업데이트하여 새 baseline 설정

---

## 명령어 요약

```bash
# 엑셀 → JSON 동기화 (가장 자주 사용)
npm run materials:sync

# JSON → 엑셀 export (긴급 복구 시에만)
npm run materials:export

# 5가지 시나리오 견적 검증
npx tsx scripts/verify-scenarios.ts

# 자재 이미지 등록률
npm run image-stats

# 이미지 등록 체크리스트 재생성
npm run image-checklist
```

---

## 자주 묻는 질문

### Q. `src/data/materials.json` 을 직접 편집해도 되나요?

❌ **안 됩니다.** 다음 sync 시 엑셀이 truth라 JSON이 덮어써집니다.
모든 변경은 `data/source/materials_master.xlsx` 에서.

### Q. sync 실행했는데 git diff 폭이 너무 큽니다.

원인 가능성:
1. **엑셀 라인 엔딩이 깨짐** — 엑셀에서 셀 안에 줄바꿈이 들어갔거나 인코딩 손상
2. **다른 사람이 JSON을 직접 편집했음** — sync 후 그 변경이 사라지는 게 정상
3. **xlsx 라이브러리 버전 불일치** — `node_modules` 재설치 (`npm ci`)

### Q. material_id를 바꾸고 싶어요.

⚠️ **추천 안 함.** 다른 자재가 그 ID를 참조하지 않더라도, `material_overrides` 로 사용자가 저장한 견적이 깨질 수 있습니다.
정말 필요하면 새 ID로 자재를 추가한 뒤 기존 자재를 삭제하세요.

### Q. 검증 시나리오 차이가 ±5%를 넘으면 어떻게 하나요?

1. 단순히 자재 단가만 바꿨는데 차이가 큼 → 정상 (의도된 변화). fixture 업데이트
2. 자재 단가 변경 없이 차이가 큼 → 코드 로직 변경이 있었을 가능성. 검토 필요
3. fixture 업데이트 방법:
   - `scripts/scenarios-fixture.json` 의 `excel_grand_total` 값을 새 웹 산출값으로 수정 (라운드 안 한 raw 값)
   - 커밋 메시지에 "왜 변경했는지" 명시

### Q. 표준면적(`src/data/standard_areas.json`)도 엑셀에 둘 수 있나요?

가능합니다. 다만 거의 변경되지 않는 데이터라 현재는 코드로만 관리 중.
필요해지면 같은 패턴(`scripts/standard-areas-from-xlsx.mjs`)으로 추가하면 됩니다.

---

## 파일 위치

| 역할 | 경로 |
|---|---|
| 자재마스터 엑셀 (단일 truth, **repo 밖**) | `C:\Users\user\Documents\Claude\Projects\int biz\materials_master.xlsx` |
| 자재마스터 JSON (build artifact) | `src/data/materials.json` |
| 표준면적 | `src/data/standard_areas.json` |
| sync 스크립트 | `scripts/materials-from-xlsx.mjs` |
| export 스크립트 | `scripts/materials-to-xlsx.mjs` |
| 검증 시나리오 fixture | `scripts/scenarios-fixture.json` |
| 검증 도구 | `scripts/verify-scenarios.ts` |
| Legacy v5 엑셀 (참조 전용) | `archive/v5_legacy_xlsx/` |
| 운영자 경로 설정 | `.env.local` (`APT_MATERIALS_XLSX`) |
