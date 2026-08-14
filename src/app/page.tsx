import { getModels } from "@/lib/api";
import { ModelRadar } from "@/components/model-radar";

// Server Component — fetches data at request time (ISR: 1h cache)
export const revalidate = 3600;

export default async function Home() {
  const models = await getModels();

  return <ModelRadar models={models} />;
}
