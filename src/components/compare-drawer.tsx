"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import type { OpenRouterModel } from "@/lib/types";
import {
  providerOf, labLabel, pricePerM, formatPrice, valueScore,
  getCapabilities, modalityShort, avatarColor, initials,
  isVariablePricing, BIG_LABS,
} from "@/lib/model-utils";
import type { BenchmarkMatch } from "@/lib/benchmarks";
import { X, Trash2, GitCompare } from "lucide-react";

interface CompareDrawerProps {
  models: OpenRouterModel[];
  benchmarks: Record<string, { text?: BenchmarkMatch; code?: BenchmarkMatch; vision?: BenchmarkMatch }>;
  open: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
}

interface RowSpec {
  label: string;
  render: (m: OpenRouterModel) => React.ReactNode;
  highlight?: (models: OpenRouterModel[]) => Set<number>; // indices to highlight as "best"
}

function Best({ children, isBest }: { children: React.ReactNode; isBest?: boolean }) {
  if (!isBest) return <>{children}</>;
  return <span className="font-bold text-green-400">{children} ✓</span>;
}

export function CompareDrawer({ models, benchmarks, open, onClose, onRemove }: CompareDrawerProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !open || models.length === 0) return null;

  const caps = (m: OpenRouterModel) => getCapabilities(m);
  const capList = (m: OpenRouterModel) => {
    const c = caps(m);
    const items: string[] = [];
    if (c.tools) items.push("Tools");
    if (c.structured) items.push("Structured");
    if (c.vision) items.push("Vision");
    if (c.webSearch) items.push("Web");
    if (c.imageGen) items.push("ImageGen");
    if (c.audio) items.push("Audio");
    if (c.reasoning) items.push("Reasoning");
    return items.length ? items.join(", ") : "—";
  };

  const rows: RowSpec[] = [
    {
      label: "Input $/M",
      render: (m) => formatPrice(pricePerM(m.pricing?.prompt)),
      highlight: (ms) => {
        const vals = ms.map(m => pricePerM(m.pricing?.prompt));
        const min = Math.min(...vals.filter(v => v !== null) as number[]);
        return new Set(vals.map((v, i) => v === min ? i : -1).filter(i => i >= 0));
      },
    },
    {
      label: "Output $/M",
      render: (m) => formatPrice(pricePerM(m.pricing?.completion)),
      highlight: (ms) => {
        const vals = ms.map(m => pricePerM(m.pricing?.completion));
        const min = Math.min(...vals.filter(v => v !== null) as number[]);
        return new Set(vals.map((v, i) => v === min ? i : -1).filter(i => i >= 0));
      },
    },
    {
      label: "Blended $/M",
      render: (m) => {
        const i = pricePerM(m.pricing?.prompt);
        const o = pricePerM(m.pricing?.completion);
        if (i === null || o === null) return "Variable";
        return formatPrice((i + o) / 2);
      },
    },
    { label: "Context", render: (m) => (m.context_length || 0).toLocaleString() },
    { label: "Provider", render: (m) => labLabel(providerOf(m.id)) },
    { label: "Modality", render: (m) => modalityShort(m) },
    { label: "Capabilities", render: (m) => capList(m) },
    {
      label: "Value Score",
      render: (m) => `${valueScore(m)}/100`,
      highlight: (ms) => {
        const vals = ms.map(m => valueScore(m));
        const max = Math.max(...vals);
        return new Set(vals.map((v, i) => v === max ? i : -1).filter(i => i >= 0));
      },
    },
    {
      label: "Arena (Text)",
      render: (m) => {
        const b = benchmarks[m.id];
        if (!b?.text) return "—";
        return `#${b.arenaModel.rank} (${b.arenaModel.score})`;
      },
      highlight: (ms) => {
        const ranks = ms.map(m => benchmarks[m.id]?.text?.arenaModel.rank);
        const valid = ranks.filter((r): r is number => r != null);
        if (valid.length === 0) return new Set<number>();
        const min = Math.min(...valid);
        return new Set(ranks.map((r, i) => r === min ? i : -1).filter(i => i >= 0));
      },
    },
    {
      label: "Arena (Code)",
      render: (m) => {
        const b = benchmarks[m.id];
        if (!b?.code) return "—";
        return `#${b.arenaModel.rank} (${b.arenaModel.score})`;
      },
    },
    {
      label: "Arena (Vision)",
      render: (m) => {
        const b = benchmarks[m.id];
        if (!b?.vision) return "—";
        return `#${b.arenaModel.rank} (${b.arenaModel.score})`;
      },
    },
  ];

  // Precompute highlights
  const highlightSets = rows.map(r => r.highlight ? (r.highlight(models) || new Set<number>()) : new Set<number>());

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl border border-border bg-background shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-3">
          <GitCompare className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold">Compare {models.length} model{models.length !== 1 ? "s" : ""}</h2>
          <div className="flex-1" />
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Comparison table */}
        <div className="overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-background">
              <tr className="border-b border-border">
                <th className="w-32 shrink-0 p-3 text-left text-xs font-medium text-muted-foreground">
                  Metric
                </th>
                {models.map((m) => {
                  const p = providerOf(m.id);
                  return (
                    <th key={m.id} className="border-l border-border p-3 text-left align-top">
                      <div className="flex items-start gap-2">
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white"
                          style={{ background: avatarColor(p) }}
                        >
                          {initials(m.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-semibold" title={m.name}>{m.name}</div>
                          <div className="truncate font-mono text-[10px] text-muted-foreground" title={m.id}>{m.id}</div>
                        </div>
                        <button
                          onClick={() => onRemove(m.id)}
                          className="shrink-0 text-muted-foreground hover:text-red-400"
                          title="Remove from comparison"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="p-3 text-xs font-medium text-muted-foreground">
                    {row.label}
                  </td>
                  {models.map((m, mi) => (
                    <td key={m.id} className="border-l border-border p-3 text-xs">
                      <Best isBest={highlightSets[ri].has(mi)}>
                        {row.render(m)}
                      </Best>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-2.5 text-[11px] text-muted-foreground">
          ✓ = best value in row · Arena scores from arena.ai (LMArena) via daily snapshots
        </div>
      </div>
    </div>,
    document.body,
  );
}
