
import os
from dotenv import load_dotenv
import google.auth
import google.auth.transport.requests
import requests

load_dotenv()
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.join(os.getcwd(), "service-account.json")

def list_publisher_models():
    scopes = ["https://www.googleapis.com/auth/cloud-platform"]
    credentials, project = google.auth.default(scopes=scopes)
    auth_req = google.auth.transport.requests.Request()
    credentials.refresh(auth_req)
    
    url = f"https://us-central1-aiplatform.googleapis.com/v1/projects/{project}/locations/us-central1/publishers/google/models"
    headers = {"Authorization": f"Bearer {credentials.token}"}
    
    response = requests.get(url, headers=headers)
    print("STATUS:", response.status_code)
    print("RESPONSE:", response.text[:2000])

list_publisher_models()
