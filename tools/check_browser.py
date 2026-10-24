#!/usr/bin/env python3
"""Run the browser fixture against the built card without BLE or HA access."""
from pathlib import Path
import shutil
import subprocess
import tempfile


def main():
    browser = next((p for name in ('chromium', 'google-chrome', 'chromium-browser', 'chrome')
                    if (p := shutil.which(name))), None)
    if not browser:
        raise SystemExit('Chrome or Chromium is required')
    root = Path(__file__).resolve().parents[1]
    with tempfile.TemporaryDirectory(prefix='niagara-card-browser-') as profile:
        result = subprocess.run([
            browser, '--headless=new', '--no-sandbox', '--disable-gpu',
            '--disable-dev-shm-usage', '--disable-crash-reporter', '--disable-breakpad',
            '--no-first-run', '--allow-file-access-from-files', f'--user-data-dir={profile}',
            '--virtual-time-budget=2000', '--dump-dom', (root/'tests/browser.html').as_uri()],
            capture_output=True, text=True, timeout=45)
        if result.returncode or '<html lang="ko" data-test-result="pass">' not in result.stdout:
            print(result.stderr[-2000:])
            print(result.stdout[-4000:])
            raise SystemExit('Browser fixture failed')
    print('PASS: built card browser fixture')


if __name__ == '__main__':
    main()
