import type { ReactNode } from 'react';
import { MaterialsProvider } from '@/lib/MaterialsProvider';

/**
 * /calc 페이지의 상위 레이아웃.
 * MaterialsProvider 가 마운트되면 클라이언트가 /api/materials 를 1회 fetch 해서
 * 전역 자재 캐시를 최신화한다.
 *
 * 초기 렌더 시점에는 bundled JSON(materials.ts seed)으로 렌더링되므로
 * 깜빡임이나 로딩 화면 없이 자연스럽게 데이터가 교체된다.
 */
export default function CalcLayout({ children }: { children: ReactNode }) {
  return <MaterialsProvider>{children}</MaterialsProvider>;
}
