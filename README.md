# ⚡ OpenRouter Model Radar

> Find the right OpenRouter model for your AI agents, chat interfaces, and LLM proxies.

A live, filterable browser of every model on [OpenRouter](https://openrouter.ai) — built specifically for people who need to pick models and plug them into **Open WebUI**, **LiteLLM**, **Hermes Agent**, **OpenClaw**, **Odysseus**, and other OpenAI-compatible tooling.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8) ![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-latest-black)

---

## What it does

OpenRouter lists 400+ models from dozens of providers. This app pulls that list live and helps you cut through the noise:

- **Sort by what matters** — cheapest, newest, best value score, longest context, most bookmarks
- **Filter by capability** — tool calling, structured output, vision, web search, image generation, audio, video, reasoning
- **Filter by provider** — GLM/Z.ai, Kimi/Moonshot, Qwen, Meta, DeepSeek, OpenAI, Anthropic, Google, xAI, Thinking Machines, and 80+ others
- **Filter by category** — text/chat, vision, image gen, audio/TTS, video, reasoning
- **Copy-ready configs** — one click to copy a model ID or a full LiteLLM YAML block
- **Bookmark models** — saved locally in your browser
- **Value score** — blended metric of cost, context length, and provider reputation
- **Variable pricing awareness** — router/auto models show "Variable" instead of broken negative costs

## Quick start

```bash
git clone https://github.com/Haxford/model-pricing.git
cd model-pricing
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the model browser, or [http://localhost:3000/setup](http://localhost:3000/setup) for the setup guide.

No API key required — the app fetches from OpenRouter's public `/api/v1/models` endpoint (CORS-enabled, cached for 1 hour via ISR).

---

## How to use this with your tools

The whole point of this app is to find a good model, copy its ID or config, and paste it into whatever you're running. Here's how for each tool:

### Open WebUI

Open WebUI connects to any OpenAI-compatible API. You have two options:

**Option A — Direct to OpenRouter (simplest)**

1. In Open WebUI, go to **Settings → Connections → OpenAI API**
2. Set the base URL to `https://openrouter.ai/api/v1`
3. Set the API key to your OpenRouter key (`sk-or-v1-...`)
4. Go to **Settings → Models**, click **+**, and paste model IDs from this app
   - Use the **📋 copy** button next to any model ID on the radar
   - Example: `z-ai/glm-5.2`, `moonshotai/kimi-k3`, `qwen/qwen3.8-2.4t-a95b`

**Option B — Through LiteLLM proxy (recommended for multi-model)**

See the LiteLLM section below, then point Open WebUI at `http://localhost:4000/v1` instead.

> **Tip:** Use the **capability filters** on the radar to find models that support **Tools** (for Open WebUI's built-in function calling) and **Vision** (for image uploads in chat).

---

### LiteLLM

LiteLLM is an OpenAI-compatible proxy that unifies 100+ providers. This app generates LiteLLM configs for you.

**Per-model config** — Click the **"LiteLLM YAML"** button on any model card to copy:

```yaml
model_list:
  - model_name: "Z.ai: GLM 5.2"
    litellm_params:
      model: "openrouter/z-ai/glm-5.2"
      api_key: "os.environ/OPENROUTER_API_KEY"
```

**Bulk export** — Filter to the models you want (e.g. cheap + tools + vision), then click **"Copy LiteLLM YAML"** in the toolbar to get a complete `config.yaml` for all visible models:

```yaml
model_list:
  - model_name: "Z.ai: GLM 5.2"
    litellm_params:
      model: "openrouter/z-ai/glm-5.2"
      api_key: "os.environ/OPENROUTER_API_KEY"

  - model_name: "Kimi K3"
    litellm_params:
      model: "openrouter/moonshotai/kimi-k3"
      api_key: "os.environ/OPENROUTER_API_KEY"

  - model_name: "Qwen3.8 2.4T A95B"
    litellm_params:
      model: "openrouter/qwen/qwen3.8-2.4t-a95b"
      api_key: "os.environ/OPENROUTER_API_KEY"
```

Save as `config.yaml` and run:

```bash
export OPENROUTER_API_KEY="sk-or-v1-..."
litellm --config config.yaml --port 4000
```

LiteLLM now serves all your selected models at `http://localhost:4000/v1`. Point Open WebUI, Hermes, OpenClaw, or any OpenAI-compatible client at it.

> **Key:** The `model` field must be `openrouter/<model-id>` — the exact ID shown on the radar. The `model_name` is the friendly name that appears in dropdowns.

---

### Hermes Agent

[Hermes Agent](https://hermes-agent.nousresearch.com) is Nous Research's open-source, self-improving AI agent with 40+ built-in tools, persistent memory, and scheduled automations.

**Using OpenRouter directly:**

```bash
# Set your OpenRouter key
echo 'OPENROUTER_API_KEY=sk-or-v1-...' >> ~/.hermes/.env

# Pick a model interactively
hermes model
# → OpenRouter is the default provider
# → Enter the model ID from this app (e.g. z-ai/glm-5.2)
```

Or set it in `~/.hermes/config.yaml`:

```yaml
model:
  provider: openrouter
  default: z-ai/glm-5.2   # ← model ID from the radar
```

Switch models mid-session:

```
/model openrouter:moonshotai/kimi-k3
/model openrouter:qwen/qwen3.8-2.4t-a95b
```

**Using LiteLLM as a gateway:**

```bash
hermes model
# → Select "Custom endpoint"
# → URL: http://localhost:4000/v1
# → API key: your LITELLM_MASTER_KEY (or skip if none)
# → Model name: whatever you set as model_name in LiteLLM config
```

> **Tip:** Hermes needs models with **tool calling** support for its 40+ built-in tools. Filter by **🔧 Tools** on the radar. Hermes also uses auxiliary models for vision and compression — pick a cheap model with **👁️ Vision** for that role.

**Hermes also supports direct provider keys** — if you find a model on the radar from z.ai, Kimi, Qwen, DeepSeek, etc., you can use that provider's native API instead of OpenRouter:

| Provider | Hermes env var | Example model |
|----------|---------------|---------------|
| z.ai (GLM) | `GLM_API_KEY` | `glm-5.2` |
| Kimi/Moonshot | `KIMI_API_KEY` | `kimi-for-coding` |
| Qwen/DashScope | `DASHSCOPE_API_KEY` | `qwen3.5-plus` |
| DeepSeek | `DEEPSEEK_API_KEY` | `deepseek-v4-pro` |
| xAI (Grok) | `XAI_API_KEY` | `grok-4-fast-reasoning` |

---

### OpenClaw

[OpenClaw](https://openclaw.ai) is an open-source AI agent platform for building assistants across 50+ messaging channels (WhatsApp, Discord, Telegram, Slack, and more).

**Connecting via OpenRouter:**

OpenClaw supports any OpenAI-compatible API. In your OpenClaw config:

```yaml
# OpenRouter direct
provider: openai-compatible
base_url: https://openrouter.ai/api/v1
api_key: ${OPENROUTER_API_KEY}
model: z-ai/glm-5.2   # ← model ID from the radar
```

**Connecting via LiteLLM:**

```yaml
# Through LiteLLM proxy
provider: openai-compatible
base_url: http://localhost:4000/v1
api_key: ${LITELLM_MASTER_KEY}
model: "Z.ai: GLM 5.2"   # ← the model_name from your LiteLLM config
```

> **Tip:** OpenClaw agents work best with models that support **tool calling** and **structured output**. Use the capability filters on the radar to narrow down. For multi-platform messaging, **vision** support is useful if users send images.

---

### Odysseus

[Odysseus](https://github.com/odysseus-dev/odysseus) is a self-hosted AI workspace for chat, agents, and deep research with OpenRouter BYOK (bring your own key) support.

**Connecting via OpenRouter:**

1. In Odysseus, go to **Settings → Models → Cloud/API Models**
2. Select **OpenRouter** as the provider
3. Enter your OpenRouter API key
4. Paste the model ID from this app (e.g. `deepseek/deepseek-v4-pro-0813`)

**Connecting via LiteLLM:**

1. Select **OpenAI-compatible** as the provider type
2. Set base URL to `http://localhost:4000/v1`
3. Enter your LiteLLM master key
4. Model name = the `model_name` from your LiteLLM config

> **Tip:** Odysseus's deep research feature benefits from models with large context windows. Sort by **context length** on the radar to find models with 128K+ tokens. The **reasoning** filter helps find models that show their thinking process for research tasks.

---

## Capability filters explained

The radar reads `supported_parameters` from the OpenRouter API to detect real capabilities:

| Filter | What it means | API parameter |
|--------|--------------|---------------|
| **🔧 Tools** | Supports function/tool calling | `tools`, `tool_choice` |
| **{} Structured** | Supports JSON schema / structured output | `structured_outputs`, `response_format` |
| **👁️ Vision** | Accepts image inputs | `architecture.input_modalities` includes `image` |
| **🌐 Web Search** | Supports OpenRouter's native web search | `web_search_options` |
| **🎨 Image Gen** | Generates images (output) | `architecture.output_modalities` includes `image` |
| **🔊 Audio** | Audio output (TTS / music) | `architecture.output_modalities` includes `audio` |
| **🎬 Video** | Accepts video input | `architecture.input_modalities` includes `video` |
| **🧠 Reasoning** | Supports reasoning/thinking mode | `reasoning`, `reasoning_effort`, `include_reasoning` |

## Sorting

The sorting is **fixed** (the original OpenRouter clone had a bug where "cheapest" showed the most expensive):

| Sort by | Direction | What it does |
|---------|-----------|-------------|
| Newest | Descending | Most recently added models first |
| Cheapest | Ascending | Lowest blended cost (in + out) first |
| Most Expensive | Descending | Highest blended cost first |
| Best Value | Descending | Value score (cost + context + flagship bonus) |
| Longest Context | Descending | Largest context window first |
| Name | Ascending | Alphabetical |

## Built-in setup guide

Visit [/setup](https://localhost:3000/setup) in the app for a step-by-step walkthrough with copy-paste commands for:
- Getting an OpenRouter API key
- Installing and configuring LiteLLM
- Connecting Open WebUI (direct or via LiteLLM)
- Docker Compose for both services together

---

## Tech stack

- **Next.js 16** with Turbopack, ISR (1-hour revalidation)
- **Tailwind CSS v4** with dark mode
- **shadcn/ui** components (Badge, Button, Card, Checkbox, Input, Select, Separator, Tabs, Tooltip)
- **lucide-react** icons
- **localStorage** for bookmarks (no backend, no database)
- Server-side fetch from `https://openrouter.ai/api/v1/models` with caching

## Project structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with dark theme
│   ├── page.tsx            # Server component — fetches models, renders radar
│   ├── setup/
│   │   └── page.tsx        # Setup guide route
│   └── globals.css         # Tailwind + theme tokens
├── components/
│   ├── model-radar.tsx     # Main UI: filters, sorting, grid, toolbar
│   ├── model-card.tsx      # Model card: badges, capabilities, copy buttons
│   ├── setup-guide.tsx     # 7-step Open WebUI + LiteLLM walkthrough
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── api.ts              # Server-side fetch with caching
│   ├── types.ts            # TypeScript types for OpenRouter API
│   ├── model-utils.ts      # Scoring, sorting, capabilities, LiteLLM YAML gen
│   ├── use-bookmarks.ts    # localStorage bookmark hook
│   └── utils.ts            # cn() helper
```

## API reference

This app consumes a single public endpoint:

```
GET https://openrouter.ai/api/v1/models
```

No authentication required. Returns a `data` array of model objects with fields including `id`, `name`, `created`, `description`, `context_length`, `architecture` (modalities), `pricing` (prompt/completion per token), `supported_parameters`, and `reasoning` config.

## Deploy

### Vercel (recommended)

```bash
vercel
```

The app is fully static-compatible with ISR — no environment variables needed.

### Docker

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
EXPOSE 3000
CMD ["npm", "start"]
```

## Roadmap

Ideas to make this more useful:

- [ ] **Model comparison view** — side-by-side cost, context, capabilities
- [ ] **Cost calculator** — estimate monthly spend based on expected token usage
- [ ] **Hermes config export** — generate `~/.hermes/config.yaml` snippets
- [ ] **OpenClaw config export** — generate OpenClaw provider configs
- [ ] **Odysseus config export** — generate Odysseus model configs
- [ ] **Benchmark integration** — pull scores from Artificial Analysis / LMArena
- [ ] **Dark/light toggle** — currently dark-only
- [ ] **PWA** — installable, offline-capable with cached model data
- [ ] **Model detail page** — full pricing breakdown, endpoint list, parameter support
- [ ] **Alerts** — notify when a new model from a tracked provider drops

## Contributing

PRs welcome. The app is a single Next.js project with no backend — everything runs client-side after the initial server fetch.

```bash
# Dev
npm run dev

# Build
npm run build

# Lint
npm run lint
```

## License

MIT

## Acknowledgements

- [OpenRouter](https://openrouter.ai) for the public models API
- [Open WebUI](https://openwebui.com) for the best self-hosted chat UI
- [LiteLLM](https://docs.litellm.ai) for the universal LLM proxy
- [Hermes Agent](https://hermes-agent.nousresearch.com) by Nous Research
- [OpenClaw](https://openclaw.ai) for multi-channel AI agents
- [Odysseus](https://github.com/odysseus-dev/odysseus) for self-hosted AI workspace
- [shadcn/ui](https://ui.shadcn.com) for the component system
