"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="group relative">
      <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 text-xs">
        <code className="font-mono">{code}</code>
      </pre>
      <button
        onClick={() => {
          navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="absolute right-2 top-2 rounded-md border border-border bg-background/80 p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <span className="absolute left-3 top-2 text-[10px] uppercase tracking-wide text-muted-foreground/60">{lang}</span>
    </div>
  );
}

function Step({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
        {num}
      </div>
      <div className="min-w-0 flex-1 space-y-2 pb-6">
        <h3 className="text-sm font-semibold">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function SetupGuide() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-4 px-4 py-3">
          <a href="/" className="text-lg font-bold tracking-tight">
            <span className="text-green-400">⚡ OpenRouter</span>{" "}
            <span className="text-blue-400">Radar</span>
          </a>
          <span className="text-xs text-muted-foreground">Setup Guide</span>
          <div className="flex-1" />
          <a
            href="/"
            className="text-sm text-blue-400 hover:underline"
          >
            ← Back to models
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold">Setup Guide: Open WebUI + LiteLLM</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connect OpenRouter models to your self-hosted Open WebUI and LiteLLM proxy.
          This guide covers getting an API key, configuring LiteLLM as a proxy, and
          pointing Open WebUI at it.
        </p>

        <div className="mt-8 space-y-2">
          <Step num={1} title="Get your OpenRouter API key">
            <p className="text-sm text-muted-foreground">
              Go to{" "}
              <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                openrouter.ai/keys <ExternalLink className="inline h-3 w-3" />
              </a>{" "}
              and create a key. You'll need it for both LiteLLM and Open WebUI.
            </p>
          </Step>

          <Step num={2} title="Install LiteLLM proxy">
            <p className="text-sm text-muted-foreground">Install the LiteLLM proxy server:</p>
            <CodeBlock lang="bash" code={`pip install 'litellm[proxy]'`} />
          </Step>

          <Step num={3} title="Create a LiteLLM config.yaml">
            <p className="text-sm text-muted-foreground">
              Use the <button onClick={() => navigator.clipboard.writeText("Copy LiteLLM YAML")} className="text-blue-400 underline">"Copy LiteLLM YAML"</button> button on the
              models page to generate a config, or write one manually. Here's a minimal example:
            </p>
            <CodeBlock lang="yaml" code={`model_list:
  - model_name: "glm-5.2"
    litellm_params:
      model: "openrouter/z-ai/glm-5.2"
      api_key: "os.environ/OPENROUTER_API_KEY"

  - model_name: "kimi-k3"
    litellm_params:
      model: "openrouter/moonshotai/kimi-k3"
      api_key: "os.environ/OPENROUTER_API_KEY"

  - model_name: "qwen3.8"
    litellm_params:
      model: "openrouter/qwen/qwen3.8-2.4t-a95b"
      api_key: "os.environ/OPENROUTER_API_KEY"

  - model_name: "deepseek-v4-pro"
    litellm_params:
      model: "openrouter/deepseek/deepseek-v4-pro-0813"
      api_key: "os.environ/OPENROUTER_API_KEY"

  - model_name: "inkling-small"
    litellm_params:
      model: "openrouter/thinkingmachines/inkling-small"
      api_key: "os.environ/OPENROUTER_API_KEY"

general_settings:
  master_key: "os.environ/LITELLM_MASTER_KEY"  # optional: protect your proxy`} />
            <p className="text-xs text-muted-foreground">
              <strong>Tip:</strong> The <code>model</code> field must start with{" "}
              <code>openrouter/</code> followed by the model ID exactly as shown on the models page
              (e.g. <code>openrouter/z-ai/glm-5.2</code>). The <code>model_name</code> is what
              Open WebUI will display — you can pick any friendly name.
            </p>
          </Step>

          <Step num={4} title="Start the LiteLLM proxy">
            <CodeBlock lang="bash" code={`# Set your API key
export OPENROUTER_API_KEY="sk-or-v1-..."

# Optional: set a master key to protect the proxy
export LITELLM_MASTER_KEY="sk-litellm-..."

# Start the proxy on port 4000
litellm --config config.yaml --port 4000`} />
            <p className="text-sm text-muted-foreground">
              The proxy exposes an OpenAI-compatible API at{" "}
              <code className="rounded bg-muted px-1">http://localhost:4000/v1</code>.
            </p>
          </Step>

          <Step num={5} title="Connect Open WebUI to LiteLLM">
            <p className="text-sm text-muted-foreground">
              In Open WebUI, go to <strong>Settings → Connections → OpenAI API</strong> and add:
            </p>
            <CodeBlock lang="env" code={`# OpenAI API Base URL
http://localhost:4000/v1

# API Key (your LITELLM_MASTER_KEY, or any string if you didn't set one)
sk-litellm-...`} />
            <p className="text-sm text-muted-foreground">
              Open WebUI will auto-discover all <code>model_name</code> entries from your LiteLLM config.
              They'll appear in the model dropdown in the chat interface.
            </p>
          </Step>

          <Step num={6} title="Alternatively: connect Open WebUI directly to OpenRouter">
            <p className="text-sm text-muted-foreground">
              If you don't need LiteLLM (rate limiting, load balancing, fallbacks),
              you can connect Open WebUI directly:
            </p>
            <CodeBlock lang="env" code={`# OpenAI API Base URL
https://openrouter.ai/api/v1

# API Key (your OpenRouter key)
sk-or-v1-...`} />
            <p className="text-sm text-muted-foreground">
              Then in <strong>Settings → Models</strong>, add model IDs manually (use the copy
              button on each model card), e.g. <code>z-ai/glm-5.2</code>.
            </p>
          </Step>

          <Step num={7} title="Docker Compose (optional)">
            <p className="text-sm text-muted-foreground">
              If you're running both in Docker:
            </p>
            <CodeBlock lang="yaml" code={`services:
  litellm:
    image: ghcr.io/berriai/litellm:main-latest
    ports:
      - "4000:4000"
    volumes:
      - ./config.yaml:/app/config.yaml
    environment:
      - OPENROUTER_API_KEY=\${OPENROUTER_API_KEY}
      - LITELLM_MASTER_KEY=\${LITELLM_MASTER_KEY}
    command: --config /app/config.yaml --port 4000

  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    ports:
      - "3000:8080"
    environment:
      - OPENAI_API_BASE_URL=http://litellm:4000/v1
      - OPENAI_API_KEY=\${LITELLM_MASTER_KEY}
    depends_on:
      - litellm
    volumes:
      - open-webui-data:/app/backend/data

volumes:
  open-webui-data:`} />
          </Step>
        </div>

        <div className="mt-8 rounded-lg border border-border bg-muted/20 p-4">
          <h3 className="text-sm font-semibold">Capability filters explained</h3>
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <p><strong className="text-foreground">Tools</strong> — supports function/tool calling. Required for Open WebUI's built-in tools and function calls.</p>
            <p><strong className="text-foreground">Structured</strong> — supports JSON schema / structured output. Good for agentic pipelines.</p>
            <p><strong className="text-foreground">Vision</strong> — accepts image inputs. For multimodal chat with image uploads.</p>
            <p><strong className="text-foreground">Web Search</strong> — supports OpenRouter's native web search option.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
