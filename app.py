
import os
from dotenv import load_dotenv
from autogen import ConversableAgent

# Load environment variables
load_dotenv()

# Configuration for Gemini
# Note: Ensure Google_API_KEY is set in your .env file
api_key = os.getenv("Google_API_KEY")

if not api_key:
    print("Error: Google_API_KEY not found in .env file.")
    exit(1)

config_list = [
    {
        "model": "gemini-1.5-flash", # Using a standard model name, can be adjusted
        "api_key": api_key,
        "api_type": "google"
    }
]

# Create the agent
agent = ConversableAgent(
    name="Gemini_Agent",
    llm_config={"config_list": config_list},
    human_input_mode="NEVER"
)

# Create a user proxy to initiate chat
user_proxy = ConversableAgent(
    name="User",
    human_input_mode="NEVER",
    code_execution_config=False, # Just chatting for this test
)

print("Starting conversation with Gemini Agent...")
try:
    # Initiate chat
    chat_result = user_proxy.initiate_chat(
        agent,
        message="Hello! Can you verify that you are running correctly as an AG2 agent?",
        max_turns=1
    )
    print("\nSuccess! Agent replied.")
except Exception as e:
    print(f"\nAn error occurred: {e}")
