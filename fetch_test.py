import urllib.request
import urllib.error

try:
    response = urllib.request.urlopen('http://localhost:8005/api/exam/admin/packages/pkg-2/results')
    print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(e.read().decode('utf-8'))
except Exception as e:
    print(e)
