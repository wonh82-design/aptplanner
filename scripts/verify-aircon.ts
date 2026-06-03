import { airconInstallRooms, activeRooms } from '../src/lib/areas';
import { defaultScope } from '../src/lib/defaults';
import type { Property } from '../src/lib/types';

function mk(pyeong: number): Property {
  return { pyeong, bay: 3, rooms: 3, common_bath: 1, master_bath: 1, balcony_depth_m: 1.5, region: 'gyeonggi', age: '15-30' };
}

console.log('━ 평형별 에어컨 실내기 설치 공간 (기본 scope) ━');
for (const py of [24, 30, 39, 40, 45]) {
  const p = mk(py);
  const rooms = airconInstallRooms(p, defaultScope());
  const kit = rooms.includes('주방') ? '주방포함 ✓' : '주방없음';
  console.log(`  ${py}평 → ${rooms.length}대 [${rooms.join(', ')}]  ${kit}`);
}

console.log('\n━ 40평 에어컨 전체 OFF → 주방 자동설치 안 됨 ━');
const p40 = mk(40);
const sOff = defaultScope();
for (const r of activeRooms(p40)) {
  const rs = sOff.rooms[r as keyof typeof sOff.rooms];
  if (rs) rs.aircon = false;
}
const off = airconInstallRooms(p40, sOff);
console.log(`  결과: ${off.length}대  ${off.length === 0 ? '✓ OK (전체 OFF면 주방도 미설치)' : '✗ FAIL'}`);

console.log('\n━ 4룸(rooms=4) 40평 ━');
const p4 = { ...mk(40), rooms: 4 as const };
const r4 = airconInstallRooms(p4, defaultScope());
console.log(`  ${r4.length}대 [${r4.join(', ')}]`);
