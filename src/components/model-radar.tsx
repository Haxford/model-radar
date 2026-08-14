"use client";

import { useMemo, useState } from "react";
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
import { useBookmarks } from "@/lib/use-bookmarks";
import {
  type OpenRouterModel,
  type SortKey,
  type SortDir,
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
  hasImageGen,
  hasAudioOutput,
  hasVideoInput,
  litellmYaml,
} from "@/lib/model-utils";
import {
  Search, RefreshCw, Loader2, Star, Wrench, Braces, Globe,
  Eye, Image as ImageIcon, Volume2, Video, FileCode, Check, Copy,
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

  // Capability filters (for Open WebUI / LiteLLM use cases)
  const [capTools, setCapTools] = useState(false);
  const [capStructured, setCapStructured] = useState(false);
  const [capVision, setCapVision] = useState(false);
  const [capWebSearch, setCapWebSearch] = useState(false);

  // Bulk LiteLLM YAML export (bookmarks or current view)
  const [copiedBulkYaml, setCopiedBulkYaml] = useState(false);

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

    // Category filter
    if (category === "bookmarks") {
      list = list.filter((m) => bookmarks.has(m.id));
    } else if (category !== "all") {
      list = list.filter((m) => modelCategory(m).includes(category as never));
    }

    // Quick filters
    if (onlyWorth) {
      list = list.filter((m) => worthTrying(m));
    }
    if (onlyNew) {
      list = list.filter((m) => isNew(m));
    }

    // Capability filters
    if (capTools) list = list.filter((m) => hasToolCalling(m));
    if (capStructured) list = list.filter((m) => hasStructuredOutput(m));
    if (capVision) list = list.filter((m) => hasVision(m));
    if (capWebSearch) list = list.filter((m) => hasWebSearch(m));

    // Provider filter
    if (providerFilter.size > 0) {
      list = list.filter((m) => providerFilter.has(providerOf(m.id)));
    }

    // Search
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

  // When sort key changes, reset dir to the sensible default for that key
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
          <a
            href="/setup"
            className="text-sm text-blue-400 hover:underline"
          >
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const list = sorted.length > 0 ? sorted : models;
                navigator.clipboard.writeText(litellmYaml(list));
                setCopiedBulkYaml(true);
                setTimeout(() => setCopiedBulkYaml(false), 1500);
              }}
              title="Copy LiteLLM config YAML for all visible models"
            >
              {copiedBulkYaml ? <Check className="h-4 w-4 text-green-400" /> : <FileCode className="h-4 w-4" />}
              {copiedBulkYaml ? "Copied!" : "Copy LiteLLM YAML"}
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
              {sorted.map((m) => (
                <ModelCard
                  key={m.id}
                  model={m}
                  bookmarked={loaded && has(m.id)}
                  onToggleBookmark={toggle}
                />
              ))}
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
        · Bookmarks stored locally · Copy model IDs or{" "}
        <a href="/setup" className="text-blue-400 hover:underline">LiteLLM YAML configs</a>{" "}
        to connect to{" "}
        <a href="https://openwebui.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Open WebUI</a>{" "}
        and{" "}
        <a href="https://docs.litellm.ai" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">LiteLLM</a>
      </footer>
    </div>
  );
}
