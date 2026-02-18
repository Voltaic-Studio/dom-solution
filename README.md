# DOM Solution

Browser automation tools for solving web challenges.

## Python Agent (browser-use)

AI-powered browser agent using the `browser-use` library.

### Setup

```bash
cd agent
pip install -r requirements.txt
playwright install
export OPENROUTER_API_KEY="sk-or-v1-..."
```

### Run

```bash
python main.py
```

### Configuration

Edit `agent/main.py` to customize:
- `model` - LLM model (`openai/gpt-4o` or `openai/gpt-4o-mini` for faster runs)
- `max_actions_per_step` - Actions per step (increase for faster execution)
- `use_vision` - Enable screenshot analysis
- `task` - The task description for the agent

---

## MCP Server (TypeScript)

Exposes browser automation as an MCP tool for Claude Desktop.

### Setup

```bash
pnpm install
```

### Run as MCP Server

```bash
pnpm mcp
```

### Add to Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "browser-challenge-solver": {
      "command": "npx",
      "args": ["tsx", "/full/path/to/dom-solution/src/mcp-server.ts"]
    }
  }
}
```

### Test the Tool

```bash
pnpm test-tool https://serene-frangipane-7fd25b.netlify.app/
```

