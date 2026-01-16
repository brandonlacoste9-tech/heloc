
import requests
import os

key = "AQ.Ab8RN6IB_CyfOEueG5cq3y_Nt3vPeMbHadYNLI4POn0vpwQlWg"
url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}"
data = { "contents":[{ "parts":[{ "text": "Hello" }] }] }

try:
    response = requests.post(url, json=data)
    print(f"Status: {response.status_code}")
    print(response.text)
except Exception as e:
    print(e)
