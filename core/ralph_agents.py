
import os
import sys
import json
import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig
from dotenv import load_dotenv, find_dotenv

# Load environment variables
load_dotenv(find_dotenv())

# Configure Vertex AI
# We'll try to pick up standard GCP auth first, then fallback to explicit key/project if needed
PROJECT_ID = os.getenv("GCP_PROJECT_ID") or "composed-sensor-483815-s2" # Discovered from gcloud list
LOCATION = os.getenv("GCP_LOCATION") or "us-central1"

try:
    vertexai.init(project=PROJECT_ID, location=LOCATION)
except Exception as e:
    print(json.dumps({"errorType": "config_error", "confidenceScore": 0.0, "suggestedFix": {"explanation": f"Vertex AI Init Failed: {str(e)}"}}))
    sys.exit(1)

def analyze_error(error_log, repo_context="Unknown Repository"):
    """
    Analyzes the error log using Vertex AI (Gemini 1.5 Pro) and returns a structured JSON result.
    """
    system_prompt = f"""
    You are a senior DevOps engineer analyzing CI/CD failure logs.
    Given the following error log and repository context, your task is to:
    1.  Identify the root cause and error type (e.g., "syntax", "dependency", "test_failure", "config", "resource", "unknown").
    2.  Suggest a specific, actionable code fix.
    3.  Provide a confidence score from 0.0 to 1.0.

    Return your analysis **strictly as a JSON object** with this exact structure:
    {{
      "errorType": "string",
      "suggestedFix": {{
        "explanation": "string",
        "files": [
          {{
            "path": "string",
            "content": "string",
            "diff": "string"
          }}
        ]
      }},
      "confidenceScore": number
    }}

    Error Log:
    {error_log}

    Repository Context: {repo_context}
    """

    try:
        # Configuration for JSON mode
        generation_config = GenerationConfig(
            temperature=0.2,
            top_p=0.95,
            top_k=64,
            max_output_tokens=8192,
            response_mime_type="application/json",
        )

        model = GenerativeModel("gemini-1.5-flash") # Using flash for speed

        response = model.generate_content(system_prompt, generation_config=generation_config)
        
        # Clean up response text
        text_content = response.text.strip()
        if text_content.startswith("```json"):
            text_content = text_content[7:]
        if text_content.endswith("```"):
            text_content = text_content[:-3]
            
        return text_content

    except Exception as e:
        # Fallback error JSON
        return json.dumps({
            "errorType": "ai_service_error",
            "suggestedFix": {
                "explanation": f"Vertex AI analysis failed: {str(e)}",
                "files": []
            },
            "confidenceScore": 0.0
        })

if __name__ == "__main__":
    if len(sys.argv) > 1:
        error_log = sys.argv[1]
        repo_context = sys.argv[2] if len(sys.argv) > 2 else "Standard Node.js/Typescript Environment"
        
        result_json = analyze_error(error_log, repo_context)
        print(result_json)
    else:
        print(json.dumps({"error": "No error log provided"}))
