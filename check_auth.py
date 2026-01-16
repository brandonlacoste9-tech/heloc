
import google.auth
from google.cloud import resourcemanager_v3

def check_auth():
    credentials, project = google.auth.default()
    print(f"Default Project: {project}")
    print(f"Service Account Email: {credentials.service_account_email if hasattr(credentials, 'service_account_email') else 'User/Adc'}")
    
check_auth()
