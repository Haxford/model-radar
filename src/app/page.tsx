"use client";

import { useState, useEffect } from "react";
import { ModelRadar } from "@/components/model-radar";
import type { OpenRouterModel } from "@/lib/types";

export default function Home() {
  const [models, setModels] = useState<OpenRouterModel[]>([]);

  useEffect(() => {
    fetch("https://openrouter.ai/api/v1/models")
      .then((res) => res.json())
      .then((json) => {
        const data = (json.data || []).filter((m: OpenRouterModel) => !m.id.startsWith("~"));
        setModels(data);
      })
      .catch(() => setModels([]));
  }, []);

  return <ModelRadar models={models} />;
}
