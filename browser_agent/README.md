
# Browser Use Agent

This agent uses the `browser-use` library to solve the 30-step challenge autonomously.

## Setup

1. Install dependencies:
```bash
cd browser_agent
pip install -r requirements.txt
playwright install
```

2. Configure Environment:
Set your OpenRouter key:
```bash
export OPENAI_API_KEY="sk-or-v1-..."
export OPENAI_BASE_URL="https://openrouter.ai/api/v1"
```

3. Run:
```bash
python main.py
```
