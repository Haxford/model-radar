import type { OpenRouterModel, ArenaLeaderboard, ArenaModel } from "./types";

const ARENA_API = "https://api.wulong.dev/arena-ai-leaderboards/v1/leaderboard";

export async function fetchLeaderboard(name: string): Promise<ArenaLeaderboard | null> {
  try {
    const res = await fetch(`${ARENA_API}?name=${name}`, {
      next: { revalidate: 21600 }, // 6 hours
    });
    if (!res.ok) return null;
    return await res.json() as ArenaLeaderboard;
  } catch {
    return null;
  }
}

export async function fetchAllLeaderboards(): Promise<{
  text: ArenaLeaderboard | null;
  code: ArenaLeaderboard | null;
  vision: ArenaLeaderboard | null;
}> {
  const [text, code, vision] = await Promise.all([
    fetchLeaderboard("text"),
    fetchLeaderboard("code"),
    fetchLeaderboard("vision"),
  ]);
  return { text, code, vision };
}

// ── Name normalization for matching ──────────────────────────────────
function normalize(s: string): string {
  return s.toLowerCase()
    .replace(/[-_.]/g, "")
    .replace(/\s+/g, "")
    .replace(/[: ].*$/, ""); // take part before colon/space
}

function normalizeModelName(name: string): string {
  // "Z.ai: GLM 5.2" → "glm52"
  // "Moonshot: Kimi K3" → "kimik3"
  const cleaned = name.replace(/^[\w.]+:\s*/, "").toLowerCase()
    .replace(/[-_.\s]/g, "")
    .replace(/[^a-z0-9]/g, "");
  return cleaned;
}

function normalizeArenaName(name: string): string {
  // "claude-opus-4-6-high" → "claudeopus46high"
  // "qwen3.8-max" → "qwen38max"
  return name.toLowerCase()
    .replace(/[-_.\s]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Extract key tokens from a model name for fuzzy matching
function extractTokens(s: string): Set<string> {
  const normalized = s.toLowerCase()
    .replace(/^[\w.]+:\s*/, "") // remove provider prefix
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
  const tokens = new Set<string>();
  for (const part of normalized.split(/\s+/)) {
    if (part.length >= 2) tokens.add(part);
  }
  // Also add the whole thing without spaces
  const compact = normalized.replace(/\s+/g, "");
  if (compact.length >= 3) tokens.add(compact);
  return tokens;
}

function tokenSimilarity(a: Set<string>, b: Set<string>): number {
  let common = 0;
  for (const t of a) {
    if (b.has(t)) common++;
  }
  return common / Math.max(a.size, b.size, 1);
}

export interface BenchmarkMatch {
  arenaModel: ArenaModel;
  leaderboard: string;
  confidence: number; // 0-1
}

export function matchModelToBenchmarks(
  model: OpenRouterModel,
  leaderboards: { text: ArenaLeaderboard | null; code: ArenaLeaderboard | null; vision: ArenaLeaderboard | null },
): { text?: BenchmarkMatch; code?: BenchmarkMatch; vision?: BenchmarkMatch } {
  const result: { text?: BenchmarkMatch; code?: BenchmarkMatch; vision?: BenchmarkMatch } = {};

  const modelTokens = extractTokens(model.name);
  const modelIdTokens = extractTokens(model.id);
  const modelNorm = normalizeModelName(model.name);
  const modelIdNorm = normalizeModelName(model.id);

  for (const [key, lb] of Object.entries(leaderboards) as [string, ArenaLeaderboard | null][]) {
    if (!lb) continue;
    let bestMatch: BenchmarkMatch | null = null;
    let bestScore = 0;

    for (const am of lb.models) {
      const arenaNorm = normalizeArenaName(am.model);
      let score = 0;

      // Exact normalized match
      if (arenaNorm === modelNorm || arenaNorm === modelIdNorm) {
        score = 1.0;
      }
      // Partial containment
      else if (modelNorm.length >= 3 && arenaNorm.includes(modelNorm)) {
        score = 0.85;
      }
      else if (modelIdNorm.length >= 3 && arenaNorm.includes(modelIdNorm)) {
        score = 0.85;
      }
      else if (arenaNorm.length >= 3 && (modelNorm.includes(arenaNorm) || modelIdNorm.includes(arenaNorm))) {
        score = 0.7;
      }
      else {
        // Token similarity
        const arenaTokens = extractTokens(am.model);
        const sim1 = tokenSimilarity(modelTokens, arenaTokens);
        const sim2 = tokenSimilarity(modelIdTokens, arenaTokens);
        score = Math.max(sim1, sim2);
        if (score >= 0.5) score *= 0.8; // penalize fuzzy matches
      }

      // Vendor matching bonus
      const provider = model.id.split("/")[0];
      const vendorMap: Record<string, string> = {
        "z-ai": "z.ai", "moonshotai": "moonshot", "qwen": "alibaba",
        "meta": "meta", "openai": "openai", "anthropic": "anthropic",
        "google": "google", "deepseek": "deepseek", "x-ai": "xai",
        "mistralai": "mistral", "minimax": "minimax",
      };
      const expectedVendor = vendorMap[provider];
      if (expectedVendor && am.vendor?.toLowerCase().includes(expectedVendor)) {
        score = Math.min(1, score + 0.1);
      }

      if (score > bestScore && score >= 0.35) {
        bestScore = score;
        bestMatch = {
          arenaModel: am,
          leaderboard: key,
          confidence: score,
        };
      }
    }

    if (bestMatch) {
      (result as Record<string, BenchmarkMatch | undefined>)[key] = bestMatch;
    }
  }

  return result;
}

// Aggregate best score across all leaderboards for sorting
export function bestBenchmarkScore(matches: ReturnType<typeof matchModelToBenchmarks>): number | null {
  const scores: number[] = [];
  if (matches.text?.arenaModel.score) scores.push(matches.text.arenaModel.score);
  if (matches.code?.arenaModel.score) scores.push(matches.code.arenaModel.score);
  if (matches.vision?.arenaModel.score) scores.push(matches.vision.arenaModel.score);
  if (scores.length === 0) return null;
  return Math.max(...scores);
}
