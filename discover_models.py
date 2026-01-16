
import vertexai
from vertexai.generative_models import GenerativeModel
import os
from dotenv import load_dotenv

load_dotenv()
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.join(os.getcwd(), "service-account.json")

vertexai.init(project="zyeutev5", location="us-central1")
model = GenerativeModel("gemini-1.5-flash")

try:
    response = model.generate_content("test")
    print("SUCCESS:", response.text)
except Exception as e:
    import traceback
    print("FAILURE:", str(e))
    # traceback.print_exc()
