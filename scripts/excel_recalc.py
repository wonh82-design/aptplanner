"""LibreOffice headless로 엑셀 파일 재계산."""
import subprocess, sys, os
sys.stdout.reconfigure(encoding='utf-8')

SOFFICE = r'C:\Program Files\LibreOffice\program\soffice.exe'

os.makedirs('tmp_xlsx_recalc', exist_ok=True)
files = ['v5_30_표준.xlsx', 'v5_30_가성비.xlsx', 'v5_30_고급.xlsx', 'v5_24_표준.xlsx', 'v5_40_표준.xlsx']

for f in files:
    src = f'tmp_xlsx/{f}'
    if not os.path.exists(src):
        print(f'X {f}: 원본 없음')
        continue
    print(f'재계산: {f}')
    r = subprocess.run([
        SOFFICE, '--headless', '--calc', '--norestore',
        '--convert-to', 'xlsx', '--outdir', 'tmp_xlsx_recalc', src
    ], capture_output=True, text=True, timeout=180)
    out = 'tmp_xlsx_recalc/' + f
    print(f'  -> {os.path.exists(out)}')
    if r.stderr:
        print(f'  stderr: {r.stderr[:300]}')

print('완료')
