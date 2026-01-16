
import requests
import json

url = "http://localhost:3004/api/fix"
data = {
    "error_log": "ReferenceError: x is not defined at /app/src/index.js:10:5"
}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print("Response JSON:")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
