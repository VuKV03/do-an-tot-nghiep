"""Debug script to test quanlythi_service endpoints directly."""
import urllib.request
import urllib.error
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

endpoints = [
    ("Health", "http://localhost:8005/health"),
    ("Sessions", "http://localhost:8005/api/exam/admin/sessions"),
    ("Candidates", "http://localhost:8005/api/exam/admin/candidates"),
    ("GW-Sessions", "http://localhost:8000/api/exam/admin/sessions"),
    ("GW-Candidates", "http://localhost:8000/api/exam/admin/candidates"),
    ("Packages", "http://localhost:8001/packages/"),
]

for name, url in endpoints:
    try:
        response = urllib.request.urlopen(url, timeout=5)
        data = response.read().decode('utf-8')
        print(f"[OK] {name} ({url}): {response.status}")
        print(f"     Data: {data[:200]}")
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        print(f"[FAIL] {name} ({url}): HTTP {e.code}")
        print(f"     Error: {body[:300]}")
    except Exception as e:
        print(f"[FAIL] {name} ({url}): {e}")
    print()
