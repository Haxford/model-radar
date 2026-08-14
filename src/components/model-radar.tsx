"use client";

import { useMemo, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ModelCard } from "@/components/model-card";
import { CompareDrawer } from "@/components/compare-drawer";
import { CostCalculator } from "@/components/cost-calculator";
import { ConfigExport } from "@/components/config-export";
import { useBookmarks } from "@/lib/use-bookmarks";
import {
  type OpenRouterModel,
  type SortKey,
  type SortDir,
  type ConfigFormat,
  CATEGORIES,
  SORT_OPTIONS,
  DEFAULT_DIR,
  providerOf,
  labLabel,
  modelCategory,
  sortModels,
  worthTrying,
  isNew,
  BIG_LABS,
  hasToolCalling,
  hasStructuredOutput,
  hasVision,
  hasWebSearch,
  litellmYaml,
  CONFIG_FORMATS,
  bulkConfig,
} from "@/lib/model-utils";
import { fetchAllLeaderboards, matchModelToBenchmarks, bestBenchmarkScore, type BenchmarkMatch } from "@/lib/benchmarks";
import {
  Search, RefreshCw, Loader2, Star, Wrench, Braces, Globe,
  Eye, FileCode, Check, Copy, GitCompare, Calculator, Download,
} from "lucide-react";

interface ModelRadarProps {
  models: OpenRouterModel[];
  onRefresh?: () => void;
}

type CategoryId = (typeof CATEGORIES)[number]["id"];

export function ModelRadar({ models, onRefresh }: ModelRadarProps) {
  const { bookmarks, toggle, has, loaded } = useBookmarks();
  const [category, setCategory] = useState<CategoryId>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("new");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [providerFilter, setProviderFilter] = useState<Set<string>>(new Set());
  const [onlyWorth, setOnlyWorth] = useState(false);
  const [onlyNew, setOnlyNew] = useState(false);

  // Capability filters
  const [capTools, setCapTools] = useState(false);
  const [capStructured, setCapStructured] = useState(false);
  const [capVision, setCapVision] = useState(false);
  const [capWebSearch, setCapWebSearch] = useState(false);

  // Compare / cost / export state
  const [compareSet, setCompareSet] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ConfigFormat>("litellm");

  // Benchmarks
  const [benchmarks, setBenchmarks] = useState<{
    text: Awaited<ReturnType<typeof fetchAllLeaderboards>>["text"];
    code: Awaited<ReturnType<typeof fetchAllLeaderboards>>["code"];
    vision: Awaited<ReturnType<typeof fetchAllLeaderboards>>["vision"];
  } | null>(null);
  const [benchmarksLoading, setBenchmarksLoading] = useState(false);

  const benchmarkMap = useMemo(() => {
    if (!benchmarks) return new Map<string, ReturnType<typeof matchModelToBenchmarks>>();
    const map = new Map<string, ReturnType<typeof matchModelToBenchmarks>>();
    for (const m of models) {
      map.set(m.id, matchModelToBenchmarks(m, benchmarks));
    }
    return map;
  }, [models, benchmarks]);

  // Fetch benchmarks lazily when user first opens compare or toggles benchmark view
  const loadBenchmarks = async () => {
    if (benchmarks || benchmarksLoading) return;
    setBenchmarksLoading(true);
    const data = await fetchAllLeaderboards();
    setBenchmarks(data);
    setBenchmarksLoading(false);
  };

  const capFilters: { key: string; label: string; icon: React.ReactNode; state: boolean; set: (v: boolean) => void; check: (m: OpenRouterModel) => boolean }[] = [
    { key: "tools", label: "Tools", icon: <Wrench className="h-3.5 w-3.5" />, state: capTools, set: setCapTools, check: hasToolCalling },
    { key: "structured", label: "Structured", icon: <Braces className="h-3.5 w-3.5" />, state: capStructured, set: setCapStructured, check: hasStructuredOutput },
    { key: "vision", label: "Vision", icon: <Eye className="h-3.5 w-3.5" />, state: capVision, set: setCapVision, check: hasVision },
    { key: "web", label: "Web Search", icon: <Globe className="h-3.5 w-3.5" />, state: capWebSearch, set: setCapWebSearch, check: hasWebSearch },
  ];

  // Build provider list with counts
  const providers = useMemo(() => {
    const counts = new Map<string, number>();
    models.forEach((m) => {
      const p = providerOf(m.id);
      counts.set(p, (counts.get(p) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => {
      const ab = BIG_LABS.has(a[0]) ? 0 : 1;
      const bb = BIG_LABS.has(b[0]) ? 0 : 1;
      if (ab !== bb) return ab - bb;
      return b[1] - a[1];
    });
  }, [models]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    models.forEach((m) => {
      const cats = modelCategory(m);
      cats.forEach((c) => {
        counts[c] = (counts[c] || 0) + 1;
      });
      counts["all"] = (counts["all"] || 0) + 1;
    });
    counts["bookmarks"] = bookmarks.size;
    return counts;
  }, [models, bookmarks]);

  // Filter
  const visible = useMemo(() => {
    let list = models.slice();

    if (category === "bookmarks") {
      list = list.filter((m) => bookmarks.has(m.id));
    } else if (category !== "all") {
      list = list.filter((m) => modelCategory(m).includes(category as never));
    }

    if (onlyWorth) list = list.filter((m) => worthTrying(m));
    if (onlyNew) list = list.filter((m) => isNew(m));

    if (capTools) list = list.filter((m) => hasToolCalling(m));
    if (capStructured) list = list.filter((m) => hasStructuredOutput(m));
    if (capVision) list = list.filter((m) => hasVision(m));
    if (capWebSearch) list = list.filter((m) => hasWebSearch(m));

    if (providerFilter.size > 0) {
      list = list.filter((m) => providerFilter.has(providerOf(m.id)));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          (m.description || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [models, category, bookmarks, onlyWorth, onlyNew, capTools, capStructured, capVision, capWebSearch, providerFilter, search]);

  // Sort
  const sorted = useMemo(() => {
    return sortModels(visible, sortKey, sortDir);
  }, [visible, sortKey, sortDir]);

  const handleSortKeyChange = (key: SortKey) => {
    setSortKey(key);
    setSortDir(DEFAULT_DIR[key]);
  };

  const toggleDir = () => {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  const toggleProvider = (p: string) => {
    setProviderFilter((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const toggleCompare = (id: string) => {
    setCompareSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 5) next.add(id);
      return next;
    });
  };

  const compareModels = useMemo(
    () => models.filter((m) => compareSet.has(m.id)),
    [models, compareSet],
  );

  const compareBenchmarks = useMemo(() => {
    const map: Record<string, { text?: BenchmarkMatch; code?: BenchmarkMatch; vision?: BenchmarkMatch }> = {};
    for (const m of compareModels) {
      map[m.id] = benchmarkMap.get(m.id) || {};
    }
    return map;
  }, [compareModels, benchmarkMap]);

  // Get benchmark score for a model card
  const getBenchmarkBadge = (m: OpenRouterModel): { score: number | null; rank: number | null } => {
    const b = benchmarkMap.get(m.id);
    if (!b) return { score: null, rank: null };
    const score = bestBenchmarkScore(b);
    // Get rank from the first available leaderboard
    let rank: number | null = null;
    if (b.text?.arenaModel.rank) rank = b.text.arenaModel.rank;
    else if (b.code?.arenaModel.rank) rank = b.code.arenaModel.rank;
    else if (b.vision?.arenaModel.rank) rank = b.vision.arenaModel.rank;
    return { score, rank };
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-4 px-4 py-3">
          <div className="text-lg font-bold tracking-tight">
            <span className="text-green-400">⚡ OpenRouter</span>{" "}
            <span className="text-blue-400">Radar</span>
          </div>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            New · cheap · worth-trying models
          </span>
          <div className="flex-1" />
          <a href="/setup" className="text-sm text-blue-400 hover:underline">
            Setup Guide
          </a>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search models…"
              className="w-44 pl-9 sm:w-64"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {models.length} models
          </div>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={!onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Category tabs */}
        <nav className="flex flex-wrap gap-1 border-t border-border px-4 py-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                category === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {cat.icon} {cat.label}
              {categoryCounts[cat.id] ? (
                <span className="ml-1 opacity-60">({categoryCounts[cat.id]})</span>
              ) : null}
            </button>
          ))}
        </nav>

        {/* Capability filters */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground">Capabilities:</span>
          {capFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => f.set(!f.state)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                f.state
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
          {(capTools || capStructured || capVision || capWebSearch) && (
            <button
              onClick={() => { setCapTools(false); setCapStructured(false); setCapVision(false); setCapWebSearch(false); }}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              clear
            </button>
          )}
        </div>
      </header>

      {/* Body: sidebar + grid */}
      <div className="flex">
        {/* Provider sidebar */}
        <aside className="sticky top-[148px] hidden h-[calc(100vh-148px)] w-56 shrink-0 overflow-y-auto border-r border-border p-3 lg:block">
          <h4 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Quick Filters
          </h4>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-sm hover:text-foreground">
              <Checkbox checked={onlyWorth} onCheckedChange={(c) => setOnlyWorth(!!c)} />
              <span className={onlyWorth ? "text-foreground" : "text-muted-foreground"}>
                Worth Trying
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-sm hover:text-foreground">
              <Checkbox checked={onlyNew} onCheckedChange={(c) => setOnlyNew(!!c)} />
              <span className={onlyNew ? "text-foreground" : "text-muted-foreground"}>
                New (14 days)
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-sm hover:text-foreground">
              <Checkbox checked={category === "bookmarks"} onCheckedChange={(c) => c && setCategory("bookmarks")} />
              <Star className="h-3.5 w-3.5" />
              <span className={category === "bookmarks" ? "text-foreground" : "text-muted-foreground"}>
                Bookmarks ({bookmarks.size})
              </span>
            </label>
          </div>

          <Separator className="my-3" />

          <h4 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Providers
          </h4>
          <div className="space-y-0.5">
            {providers.map(([p, n]) => (
              <label
                key={p}
                className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Checkbox
                  checked={providerFilter.has(p)}
                  onCheckedChange={() => toggleProvider(p)}
                />
                <span className="truncate">
                  {labLabel(p)}{" "}
                  <span className="opacity-50">({n})</span>
                </span>
              </label>
            ))}
          </div>
        </aside>

        {/* Main grid */}
        <main className="min-w-0 flex-1 p-4">
          {/* Toolbar */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort:</span>
            <Select value={sortKey} onValueChange={(v) => handleSortKeyChange(v as SortKey)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={toggleDir}>
              {sortDir === "asc" ? "↑ Asc" : "↓ Desc"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Showing {sorted.length} model{sorted.length !== 1 ? "s" : ""}
            </span>
            <div className="flex-1" />

            {/* Action buttons */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadBenchmarks()}
              disabled={benchmarksLoading || !!benchmarks}
              title="Load Arena AI (LMArena) benchmark scores"
            >
              {benchmarksLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
              {benchmarks ? "Scores loaded" : "Load scores"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCalcOpen(true)}
              disabled={compareSet.size === 0}
              title="Cost calculator for selected models"
            >
              <Calculator className="h-4 w-4" />
              Calculator
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportOpen(true)}
              disabled={sorted.length === 0}
              title="Export config for all visible models"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button
              variant={compareSet.size > 0 ? "default" : "outline"}
              size="sm"
              onClick={() => { setCompareOpen(true); loadBenchmarks(); }}
              disabled={compareSet.size === 0}
              title="Compare selected models side-by-side"
            >
              <GitCompare className="h-4 w-4" />
              Compare ({compareSet.size})
            </Button>
          </div>

          {/* Grid */}
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              {models.length === 0 ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="mt-3 text-sm">Loading models from OpenRouter…</p>
                </>
              ) : category === "bookmarks" ? (
                <>
                  <Star className="h-12 w-12 text-yellow-400/50" />
                  <h3 className="mt-4 text-lg font-semibold text-foreground">
                    No bookmarks yet
                  </h3>
                  <p className="mt-1 text-sm">
                    Click the ☆ star on any model card to save it here.
                  </p>
                </>
              ) : (
                <p className="text-sm">No models match your filters. Try another category or clear search.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {sorted.map((m) => {
                const bench = getBenchmarkBadge(m);
                return (
                  <ModelCard
                    key={m.id}
                    model={m}
                    bookmarked={loaded && has(m.id)}
                    onToggleBookmark={toggle}
                    comparing={compareSet.has(m.id)}
                    onToggleCompare={toggleCompare}
                    benchmarkScore={bench.score}
                    benchmarkRank={bench.rank}
                  />
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground">
        Data live from{" "}
        <a
          href="https://openrouter.ai/api/v1/models"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline"
        >
          OpenRouter public API
        </a>{" "}
        · Benchmarks from{" "}
        <a href="https://arena.ai/leaderboard" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
          Arena.ai (LMArena)
        </a>{" "}
        · Bookmarks stored locally ·{" "}
        <a href="/setup" className="text-blue-400 hover:underline">Setup Guide</a>{" "}
        for Open WebUI, LiteLLM, Hermes, OpenClaw & Odysseus
      </footer>

      {/* Modals */}
      <CompareDrawer
        models={compareModels}
        benchmarks={compareBenchmarks}
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        onRemove={(id) => toggleCompare(id)}
      />
      <CostCalculator
        models={models}
        open={calcOpen}
        onClose={() => setCalcOpen(false)}
        selectedIds={compareSet}
        onToggle={toggleCompare}
      />
      <ConfigExport
        models={compareModels.length > 0 ? compareModels : sorted}
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        defaultFormat={exportFormat}
      />
    </div>
  );
}
