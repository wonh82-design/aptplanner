# v5 Legacy 엑셀 — 참조 전용 아카이브

이 폴더의 파일들은 **계산 로직 시트(공사비산출 등)가 포함된 v5 엑셀**입니다.
계산 로직은 웹 (`src/lib/calculator.ts`)으로 완전히 이전되어 더 이상 운영에 사용하지 않습니다.

## 파일 목록

| 파일 | 평형 | 등급 |
|---|---|---|
| `v5_24_표준.xlsx` | 24평 | 표준 |
| `v5_30_가성비.xlsx` | 30평 | 가성비 |
| `v5_30_표준.xlsx` | 30평 | 표준 (baseline) |
| `v5_30_고급.xlsx` | 30평 | 고급 |
| `v5_40_표준.xlsx` | 40평 | 표준 |

## 사용처

1. **scripts/scenarios-fixture.json 의 ground truth 출처**
   - 각 파일의 메인 시트(공사비산출) 결과를 `excel_grand_total` 값으로 보존
   - 자재 단가 변경 시 fixture를 의도적으로 업데이트할 때 참조

2. **새 시나리오 추가 시**
   - LibreOffice headless 로 재계산: `python scripts/excel_recalc.py`
   - 결과 grand_total 값을 fixture에 추가

## ⚠️ 주의

- **이 파일들을 직접 편집하지 마세요.** 계산 로직 시트가 깨질 수 있고, 그러면 ground truth 자체가 오염됩니다.
- **자재 추가/단가 변경은 `data/source/materials_master.xlsx` 에서.**
- 이 폴더는 git 추적되지만 일상 작업에서 건드릴 일이 없습니다.
