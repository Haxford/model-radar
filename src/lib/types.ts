// OpenRouter model types — matches the public /api/v1/models response

export interface ModelPricing {
  prompt: string | null;
  completion: string | null;
  input_cache_read?: string | null;
  image?: string | null;
  request?: string | null;
  web_search?: string | null;
  reasoning?: string | null;
  overrides?: Array<{
    min_prompt_tokens: number;
    prompt: string;
    completion: string;
  }>;
}

export interface ModelArchitecture {
  modality: string;
  input_modalities: string[];
  output_modalities: string[];
  tokenizer: string | null;
  instruct_type: string | null;
}

export interface ModelReasoning {
  mandatory?: boolean;
  default_enabled?: boolean;
  supported_efforts?: string[];
  default_effort?: string;
}

export interface ModelTopProvider {
  context_length?: number;
  max_completion_tokens?: number;
  is_moderated?: boolean;
}

export interface OpenRouterModel {
  id: string;
  canonical_slug?: string;
  name: string;
  created: number;
  description: string;
  context_length: number;
  architecture: ModelArchitecture;
  pricing: ModelPricing;
  top_provider: ModelTopProvider;
  per_request_limits: unknown;
  supported_parameters: string[];
  default_parameters: Record<string, unknown>;
  supported_voices: string[] | null;
  knowledge_cutoff: string | null;
  expiration_date: string | null;
  links?: { details: string };
  reasoning: ModelReasoning | null;
}

export interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

// ── Benchmark data (LMArena / Arena AI) ──────────────────────────────
export interface ArenaModel {
  rank: number;
  model: string;     // name as shown on arena.ai
  vendor: string | null;
  license: "proprietary" | "open" | null;
  score: number | null;   // ELO
  ci: number | null;      // 95% confidence interval ±
  votes: number | null;
}

export interface ArenaLeaderboard {
  meta: {
    leaderboard: string;
    source_url: string;
    fetched_at: string;
    last_updated?: string;
    model_count: number;
  };
  models: ArenaModel[];
}
