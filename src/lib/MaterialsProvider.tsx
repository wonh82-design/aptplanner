'use client';

/**
 * MaterialsProvider — 클라이언트 부팅 시 /api/materials 를 1회 fetch 하고
 * 응답을 setMaterials() 로 전역 materials 캐시에 주입.
 *
 * 사용처:
 *  - /calc 페이지 (계산기 + 자재 카드 UI)
 *  - /admin/materials* (편집 후 다른 페이지에서도 새 데이터 반영)
 *
 * 패턴:
 *  - 초기 렌더 시점에는 bundled JSON(materials.ts 의 seed)을 그대로 사용 → 깜빡임 없음
 *  - 마운트 직후 fetch → setMaterials() 로 갱신 → 다음 리렌더에서 새 데이터 반영
 *  - Context 의 `materials` 와 `updatedAt` 은 변경 감지용 — 컨슈머는 의존성에 넣어
 *    리렌더를 트리거할 수 있다.
 *
 * 폴백: fetch 실패 시 bundled JSON 그대로 유지 (graceful degradation).
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Material } from './types';
import { ALL_MATERIALS, setMaterials as updateGlobalMaterials } from './materials';

type Ctx = {
  materials: Material[];
  loading: boolean;
  /** 데이터가 갱신될 때마다 증가하는 카운터 — 컨슈머가 useMemo 의존성으로 사용 */
  version: number;
  refetch: () => Promise<void>;
};

const MaterialsContext = createContext<Ctx>({
  materials: ALL_MATERIALS,
  loading: false,
  version: 0,
  refetch: async () => {},
});

export function MaterialsProvider({ children }: { children: React.ReactNode }) {
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchMaterials = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/materials', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (Array.isArray(json.materials) && json.materials.length > 0) {
        updateGlobalMaterials(json.materials as Material[]);
        setVersion((v) => v + 1);
      }
    } catch (e) {
      // graceful degradation — bundled JSON 그대로 사용
      console.warn('[MaterialsProvider] fetch 실패, bundled JSON 유지:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  return (
    <MaterialsContext.Provider
      value={{ materials: ALL_MATERIALS, loading, version, refetch: fetchMaterials }}
    >
      {children}
    </MaterialsContext.Provider>
  );
}

export function useMaterials(): Ctx {
  return useContext(MaterialsContext);
}
