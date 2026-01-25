import urllib.request
import json

try:
    data = json.dumps({"username": "admin", "password": "123456"}).encode('utf-8')
    req = urllib.request.Request('http://127.0.0.1:5000/auth/login', data=data, headers={'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(req) as response:
        print(f'Status: {response.status}')
        print(f'Response: {response.read().decode()}')
except Exception as e:
    print(f'Error: {e}')