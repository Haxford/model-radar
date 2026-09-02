"use client";

import { useState, useEffect, useCallback } from "react";
import { ModelRadar } from "@/components/model-radar";
import type { OpenRouterModel } from "@/lib/types";

const API_URL = "https://openrouter.ai/api/v1/models";

export default function Home() {
  const [models, setModels] = useState<OpenRouterModel[]>([]);

  const loadModels = useCallback(() => {
    fetch(API_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`OpenRouter API returned ${res.status}`);
        return res.json();
      })
      .then((json) => {
        const data = (json.data || []).filter((m: OpenRouterModel) => !m.id.startsWith("~"));
        setModels(data);
      })
      .catch(() => {
        // Keep whatever list we already have (initial state is empty).
      });
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  return <ModelRadar models={models} onRefresh={loadModels} />;
}
