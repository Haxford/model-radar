import type { OpenRouterModel } from "./types";
export type { OpenRouterModel } from "./types";

// ── Providers ──────────────────────────────────────────────────────────
export const BIG_LABS = new Set([
  "z-ai", "moonshotai", "qwen", "meta", "meta-llama", "openai", "anthropic",
  "google", "deepseek", "bytedance", "bytedance-seed", "thinkingmachines",
  "x-ai", "mistralai", "cohere", "microsoft", "amazon", "nvidia",
  "perplexity", "minimax", "tencent", "baidu", "stepfun", "xiaomi",
  "meituan", "inception", "aion-labs",
]);

export const LAB_LABEL: Record<string, string> = {
  "z-ai": "Z.ai (GLM)",
  "moonshotai": "Moonshot (Kimi)",
  "qwen": "Qwen",
  "meta": "Meta",
  "meta-llama": "Meta Llama",
  "openai": "OpenAI",
  "anthropic": "Anthropic",
  "google": "Google",
  "deepseek": "DeepSeek",
  "bytedance": "ByteDance",
  "bytedance-seed": "ByteDance Seed",
  "thinkingmachines": "Thinking Machines",
  "x-ai": "xAI",
  "mistralai": "Mistral",
  "cohere": "Cohere",
  "microsoft": "Microsoft",
  "amazon": "Amazon",
  "nvidia": "NVIDIA",
  "perplexity": "Perplexity",
  "minimax": "MiniMax",
  "tencent": "Tencent",
  "baidu": "Baidu",
  "stepfun": "StepFun",
  "xiaomi": "Xiaomi",
  "meituan": "Meituan",
  "inception": "Inception",
  "aion-labs": "Aion Labs",
};

export function providerOf(id: string): string {
  return id.split("/")[0].replace(/^~/, "");
}

export function labLabel(p: string): string {
  return LAB_LABEL[p] || p.charAt(0).toUpperCase() + p.slice(1);
}

// ── Pricing helpers ───────────────────────────────────────────────────
// OpenRouter prices are per-token in USD. Convert to $/1M tokens.
// Sentinels: -1 means dynamic/variable pricing (routers, auto-selectors).
export function pricePerM(tok: string | null | undefined): number | null {
  const raw = tok?.trim();
  if (!raw || raw === "0") return 0;
  const v = parseFloat(raw);
  if (isNaN(v)) return 0;
  // Negative = dynamic/variable pricing (router/auto models)
  if (v < 0) return null;
  return v * 1_000_000;
}

/** True if the model has variable/dynamic pricing (e.g. router models). */
export function isVariablePricing(m: OpenRouterModel): boolean {
  const p = m.pricing;
  return (
    parseFloat(p?.prompt || "0") < 0 ||
    parseFloat(p?.completion || "0") < 0
  );
}

export function blendedCost(m: OpenRouterModel): number | null {
  const p = pricePerM(m.pricing?.prompt);
  const c = pricePerM(m.pricing?.completion);
  if (p === null || c === null) return null; // variable/dynamic pricing
  return (p + c) / 2;
}

export function formatPrice(perM: number | null): string {
  if (perM === null) return "Variable";
  if (perM === 0) return "Free";
  if (perM < 0.01) return `$${perM.toFixed(4)}`;
  if (perM < 1) return `$${perM.toFixed(3)}`;
  return `$${perM.toFixed(2)}`;
}

// ── Categorization ────────────────────────────────────────────────────
export type Category =
  | "all"
  | "text"
  | "vision"
  | "image-gen"
  | "audio"
  | "video"
  | "reasoning"
  | "bookmarks";

export const CATEGORIES: { id: Category; label: string; icon: string }[] = [
  { id: "all", label: "All Models", icon: "📚" },
  { id: "text", label: "Text / Chat", icon: "💬" },
  { id: "vision", label: "Vision", icon: "👁️" },
  { id: "image-gen", label: "Image Gen", icon: "🎨" },
  { id: "audio", label: "Audio / TTS", icon: "🔊" },
  { id: "video", label: "Video", icon: "🎬" },
  { id: "reasoning", label: "Reasoning", icon: "🧠" },
  { id: "bookmarks", label: "Bookmarks", icon: "⭐" },
];

export function getInputModalities(m: OpenRouterModel): Set<string> {
  return new Set(m.architecture?.input_modalities || ["text"]);
}

export function getOutputModalities(m: OpenRouterModel): Set<string> {
  return new Set(m.architecture?.output_modalities || ["text"]);
}

export function modelCategory(m: OpenRouterModel): Category[] {
  const cats: Category[] = [];
  const out = getOutputModalities(m);
  const inp = getInputModalities(m);
  const modality = m.architecture?.modality || "";

  // Image generation: produces image output
  if (out.has("image")) cats.push("image-gen");

  // Audio output (TTS / music)
  if (out.has("audio")) cats.push("audio");

  // Video: accepts video input
  if (inp.has("video") || modality.includes("video")) cats.push("video");

  // Vision: accepts image input (but not purely image-gen)
  if (inp.has("image") && !out.has("image")) cats.push("vision");

  // Text / chat: text->text or text output without other special output
  if (out.has("text") && !out.has("image") && !out.has("audio")) {
    cats.push("text");
  }
  // If a model has text output + image output, still show in text (multimodal)
  if (out.has("text") && cats.length === 0) cats.push("text");

  // Reasoning
  if (isReasoning(m)) cats.push("reasoning");

  // Fallback: if no categories matched, it's text
  if (cats.length === 0) cats.push("text");

  return cats;
}

export function isReasoning(m: OpenRouterModel): boolean {
  if (m.reasoning && (m.reasoning.mandatory || m.reasoning.default_enabled)) return true;
  const params = new Set(m.supported_parameters || []);
  return params.has("reasoning") || params.has("reasoning_effort") || params.has("include_reasoning");
}

export function isMandatoryReasoning(m: OpenRouterModel): boolean {
  return !!m.reasoning?.mandatory;
}

// ── Capabilities (for Open WebUI / LiteLLM) ──────────────────────────
export function hasToolCalling(m: OpenRouterModel): boolean {
  const params = new Set(m.supported_parameters || []);
  return params.has("tools") || params.has("tool_choice");
}

export function hasParallelToolCalls(m: OpenRouterModel): boolean {
  const params = new Set(m.supported_parameters || []);
  return params.has("parallel_tool_calls");
}

export function hasStructuredOutput(m: OpenRouterModel): boolean {
  const params = new Set(m.supported_parameters || []);
  return params.has("structured_outputs") || params.has("response_format");
}

export function hasWebSearch(m: OpenRouterModel): boolean {
  const params = new Set(m.supported_parameters || []);
  return params.has("web_search_options");
}

export function hasVision(m: OpenRouterModel): boolean {
  return getInputModalities(m).has("image");
}

export function hasImageGen(m: OpenRouterModel): boolean {
  return getOutputModalities(m).has("image");
}

export function hasAudioOutput(m: OpenRouterModel): boolean {
  return getOutputModalities(m).has("audio");
}

export function hasVideoInput(m: OpenRouterModel): boolean {
  const inp = getInputModalities(m);
  return inp.has("video");
}

export interface ModelCapabilities {
  tools: boolean;
  parallelTools: boolean;
  structured: boolean;
  webSearch: boolean;
  vision: boolean;
  imageGen: boolean;
  audio: boolean;
  video: boolean;
  reasoning: boolean;
  mandatoryReasoning: boolean;
}

export function getCapabilities(m: OpenRouterModel): ModelCapabilities {
  return {
    tools: hasToolCalling(m),
    parallelTools: hasParallelToolCalls(m),
    structured: hasStructuredOutput(m),
    webSearch: hasWebSearch(m),
    vision: hasVision(m),
    imageGen: hasImageGen(m),
    audio: hasAudioOutput(m),
    video: hasVideoInput(m),
    reasoning: isReasoning(m),
    mandatoryReasoning: isMandatoryReasoning(m),
  };
}

// ── LiteLLM config generation ────────────────────────────────────────
export interface LiteLLMModelConfig {
  model_name: string;
  litellm_params: {
    model: string; // openrouter/<id>
    api_key: string; // os.environ/OPENROUTER_API_KEY
  };
}

export function litellmYaml(models: OpenRouterModel[]): string {
  const entries = models.map((m) => `  - model_name: "${m.name.replace(/"/g, '\\"')}"
    litellm_params:
      model: "openrouter/${m.id}"
      api_key: "os.environ/OPENROUTER_API_KEY"`);
  return `model_list:
${entries.join("\n")}
`;
}

export function litellmSingleModel(m: OpenRouterModel): string {
  return `model_list:
  - model_name: "${m.name.replace(/"/g, '\\"')}"
    litellm_params:
      model: "openrouter/${m.id}"
      api_key: "os.environ/OPENROUTER_API_KEY"`;
}

// ── Open WebUI connection info ───────────────────────────────────────
export function openWebuiEnvKey(modelId: string): string {
  return `OPENROUTER_API_KEY=your-key-here
OPENROUTER_MODEL=${modelId}`;
}

// ── Scoring & flags ───────────────────────────────────────────────────
const WEEK_SECONDS = 14 * 24 * 60 * 60; // 14 days

export function isNew(m: OpenRouterModel): boolean {
  return Date.now() / 1000 - (m.created || 0) < WEEK_SECONDS;
}

export function valueScore(m: OpenRouterModel): number {
  const c = blendedCost(m);
  const ctx = m.context_length || 4096;
  let s = 0;
  // cost component (cheaper = better), log-scaled.
  // Variable pricing models get a mid-range score (35).
  if (c === null) s += 35;
  else if (c <= 0) s += 60;
  else s += Math.max(0, 50 - Math.log10(c + 1) * 25);
  // context component
  s += Math.min(30, Math.log2(ctx / 4096) * 4);
  // flagship bonus
  if (BIG_LABS.has(providerOf(m.id))) s += 8;
  return Math.round(Math.max(0, Math.min(100, s)));
}

export function worthTrying(m: OpenRouterModel): boolean {
  const v = valueScore(m);
  const newish = isNew(m);
  const c = blendedCost(m);
  const cheap = c !== null && c < 2;
  return v >= 55 || (newish && v >= 45) || (cheap && BIG_LABS.has(providerOf(m.id)));
}

// ── Sorting ───────────────────────────────────────────────────────────
export type SortKey = "new" | "cheap_in" | "cheap_out" | "value" | "context" | "name";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "new", label: "Newest" },
  { value: "cheap_in", label: "Cheapest Input" },
  { value: "cheap_out", label: "Cheapest Output" },
  { value: "value", label: "Best Value" },
  { value: "context", label: "Largest Context" },
  { value: "name", label: "Name A→Z" },
];

// Default sort direction for each key.
// "cheapest" should show cheapest FIRST = ascending.
// "newest" should show newest FIRST = descending.
// "best value" should show highest score FIRST = descending.
// "largest context" should show biggest FIRST = descending.
// "name" should be A→Z = ascending.
export const DEFAULT_DIR: Record<SortKey, "asc" | "desc"> = {
  new: "desc",
  cheap_in: "asc",
  cheap_out: "asc",
  value: "desc",
  context: "desc",
  name: "asc",
};

export type SortDir = "asc" | "desc";

export function getSortValue(m: OpenRouterModel, key: SortKey): number | string {
  switch (key) {
    case "new": return m.created || 0;
    case "cheap_in": {
      const v = pricePerM(m.pricing?.prompt);
      // Variable pricing → sort last (large number for asc, -1 for desc)
      return v === null ? Infinity : v;
    }
    case "cheap_out": {
      const v = pricePerM(m.pricing?.completion);
      return v === null ? Infinity : v;
    }
    case "value": return valueScore(m);
    case "context": return m.context_length || 0;
    case "name": return m.name.toLowerCase();
  }
}

export function sortModels(
  models: OpenRouterModel[],
  key: SortKey,
  dir: SortDir
): OpenRouterModel[] {
  const sorted = [...models].sort((a, b) => {
    const va = getSortValue(a, key);
    const vb = getSortValue(b, key);
    if (typeof va === "string" || typeof vb === "string") {
      return String(va).localeCompare(String(vb));
    }
    return va - vb;
  });
  // For ascending, smallest first. For descending, largest first.
  return dir === "asc" ? sorted : sorted.reverse();
}

// ── Misc ──────────────────────────────────────────────────────────────
export function modalityShort(m: OpenRouterModel): string {
  return m.architecture?.modality || "text->text";
}

export function avatarColor(p: string): string {
  const palette: Record<string, string> = {
    "z-ai": "#5b8def",
    "moonshotai": "#1a1a1a",
    "qwen": "#6f42c1",
    "meta": "#0866ff",
    "meta-llama": "#0866ff",
    "openai": "#10a37f",
    "anthropic": "#d97757",
    "google": "#4285f4",
    "deepseek": "#4f46e5",
    "bytedance": "#ff2c55",
    "bytedance-seed": "#ff2c55",
    "thinkingmachines": "#a88bfa",
    "x-ai": "#ffffff",
    "mistralai": "#ff7000",
    "cohere": "#39d98a",
    "microsoft": "#0078d4",
    "nvidia": "#76b900",
  };
  return palette[p] || "#3a4a63";
}

export function initials(name: string): string {
  const cleaned = name.replace(/^[\w-]+:\s*/, "");
  const words = cleaned.split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
}
