import os
import sys
from autogen import ConversableAgent, AssistantAgent
from dotenv import load_dotenv

load_dotenv()

# Define the "Fixer" configuration
config_list = [{"model": "gemini-1.5-pro", "api_key": os.environ.get("GEMINI_API_KEY"), "api_type": "google"}]

# 1. The Analyst Agent (Sequential Thinking)
analyst = AssistantAgent(
    name="Ralph_Analyst",
    system_message="You analyze CI logs. Identify the root cause (e.g., dependency clash, syntax error).",
    llm_config={"config_list": config_list},
)

# 2. The Executor Agent (Code Writer)
executor = AssistantAgent(
    name="Ralph_Executor",
    system_message="You provide the exact code fix or terminal commands to resolve the CI error.",
    llm_config={"config_list": config_list},
)

print("🚀 Ralph Brain Initialized via AG2")

if len(sys.argv) > 1:
    error_log = sys.argv[1]
    # For now, we just acknowledge receipt of the log in the scaffold
    print(f"Received error log length: {len(error_log)}")
