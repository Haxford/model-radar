import type { OpenRouterModel, OpenRouterModelsResponse } from "./types";

const API_URL = "https://openrouter.ai/api/v1/models";

export async function fetchModels(): Promise<OpenRouterModel[]> {
  const res = await fetch(API_URL, {
    next: { revalidate: 3600 }, // cache for 1 hour on the server
  });
  if (!res.ok) throw new Error(`OpenRouter API returned ${res.status}`);
  const json: OpenRouterModelsResponse = await res.json();
  // Filter out ~prefixed (free) duplicate variants — keep the main model
  return (json.data || []).filter((m) => !m.id.startsWith("~"));
}

export async function getModels(): Promise<OpenRouterModel[]> {
  try {
    return await fetchModels();
  } catch {
    return [];
  }
}
