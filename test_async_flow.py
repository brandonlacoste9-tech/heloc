
import requests
import json
import time

# 1. Submit Job
base_url = "http://localhost:3003"
analyze_url = f"{base_url}/api/analyze"

data = {
    "logData": "ReferenceError: x is not defined at /app/src/index.js:10:5",
    "repoUrl": "owner/heloc-test",
    "commitHash": "abc1234",
    "provider": "github"
}

print(f"Submitting Analysis Job to {analyze_url}...")
try:
    response = requests.post(analyze_url, json=data)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 202:
        res_json = response.json()
        job_id = res_json['jobId']
        print(f"Job Accepted! ID: {job_id}")
        
        # 2. Poll Status
        status_url = f"{base_url}/api/status/{job_id}"
        print(f"Polling status at {status_url}...")
        
        for i in range(15):
            time.sleep(3) # Wait 3s
            status_res = requests.get(status_url).json()
            status = status_res['status']
            print(f"Status: {status}")
            
            if status == 'completed':
                print("\nAnalysis Complete!")
                print(f"Fix: {status_res.get('fixSuggestion', 'No fix returned')}")
                break
            elif status == 'failed':
                print("\nAnalysis Failed.")
                break
    else:
        print(f"Error: {response.text}")

except Exception as e:
    print(f"Error: {e}")
