"use client";

import { createPortal } from "react-dom";
import { useEffect, useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { OpenRouterModel } from "@/lib/types";
import {
  providerOf, labLabel, pricePerM, formatPrice, formatCost,
  estimateCost, isVariablePricing, avatarColor, initials,
} from "@/lib/model-utils";
import { X, Calculator, Trash2 } from "lucide-react";

interface CostCalculatorProps {
  models: OpenRouterModel[];
  open: boolean;
  onClose: () => void;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}

export function CostCalculator({ models, open, onClose, selectedIds, onToggle }: CostCalculatorProps) {
  const [mounted, setMounted] = useState(false);
  const [messagesPerDay, setMessagesPerDay] = useState(100);
  const [avgInputTokens, setAvgInputTokens] = useState(2000);
  const [avgOutputTokens, setAvgOutputTokens] = useState(800);

  useEffect(() => setMounted(true), []);
  if (!mounted || !open) return null;

  const selectedModels = useMemo(
    () => models.filter((m) => selectedIds.has(m.id)),
    [models, selectedIds],
  );

  const estimates = useMemo(() => {
    return selectedModels
      .map((m) => ({ model: m, est: estimateCost(m, messagesPerDay, avgInputTokens, avgOutputTokens) }))
      .filter((x) => x.est !== null) as { model: OpenRouterModel; est: NonNullable<ReturnType<typeof estimateCost>> }[];
  }, [selectedModels, messagesPerDay, avgInputTokens, avgOutputTokens]);

  const totalMonthly = estimates.reduce((sum, x) => sum + x.est.monthlyCost, 0);
  const totalDaily = estimates.reduce((sum, x) => sum + x.est.dailyCost, 0);
  const cheapest = estimates.length > 0
    ? estimates.reduce((min, x) => x.est.monthlyCost < min.est.monthlyCost ? x : min)
    : null;
  const priciest = estimates.length > 0
    ? estimates.reduce((max, x) => x.est.monthlyCost > max.est.monthlyCost ? x : max)
    : null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-border bg-background shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-3">
          <Calculator className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold">Cost Calculator</h2>
          <div className="flex-1" />
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-auto p-5 space-y-4">
          {/* Usage inputs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Messages / day
              </label>
              <Input
                type="number"
                value={messagesPerDay}
                onChange={(e) => setMessagesPerDay(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Avg input tokens / msg
              </label>
              <Input
                type="number"
                value={avgInputTokens}
                onChange={(e) => setAvgInputTokens(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Avg output tokens / msg
              </label>
              <Input
                type="number"
                value={avgOutputTokens}
                onChange={(e) => setAvgOutputTokens(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full"
              />
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">Presets:</span>
            {[
              { label: "Light (50/day, 1k in, 500 out)", msgs: 50, inp: 1000, out: 500 },
              { label: "Medium (200/day, 2k in, 800 out)", msgs: 200, inp: 2000, out: 800 },
              { label: "Heavy (1000/day, 4k in, 2k out)", msgs: 1000, inp: 4000, out: 2000 },
              { label: "Agentic (500/day, 8k in, 4k out)", msgs: 500, inp: 8000, out: 4000 },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => { setMessagesPerDay(p.msgs); setAvgInputTokens(p.inp); setAvgOutputTokens(p.out); }}
                className="text-xs text-blue-400 hover:underline"
              >
                {p.label.split(" (")[0]}
              </button>
            ))}
          </div>

          {/* Results */}
          {estimates.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {selectedModels.length === 0
                ? "Select models to compare costs. Use the compare toggle on model cards."
                : "All selected models have variable pricing — cost estimation not available."}
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/40 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Daily Total</div>
                  <div className="mt-1 text-lg font-bold text-foreground">{formatCost(totalDaily)}</div>
                </div>
                <div className="rounded-lg border bg-green-500/10 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-green-400">Monthly Total</div>
                  <div className="mt-1 text-lg font-bold text-green-400">{formatCost(totalMonthly)}</div>
                </div>
                <div className="col-span-2 rounded-lg border bg-muted/40 p-3 sm:col-span-1">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Models</div>
                  <div className="mt-1 text-lg font-bold text-foreground">{estimates.length}</div>
                </div>
              </div>

              {/* Per-model table */}
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="p-2.5 text-left font-medium text-muted-foreground">Model</th>
                      <th className="p-2.5 text-right font-medium text-muted-foreground">$/msg</th>
                      <th className="p-2.5 text-right font-medium text-muted-foreground">Daily</th>
                      <th className="p-2.5 text-right font-medium text-muted-foreground">Monthly</th>
                      <th className="w-8 p-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimates
                      .sort((a, b) => a.est.monthlyCost - b.est.monthlyCost)
                      .map(({ model: m, est }) => {
                        const p = providerOf(m.id);
                        const isCheapest = cheapest?.model.id === m.id;
                        const isPriciest = priciest?.model.id === m.id;
                        return (
                          <tr key={m.id} className="border-b border-border/50 hover:bg-muted/20">
                            <td className="p-2.5">
                              <div className="flex items-center gap-2">
                                <div
                                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-bold text-white"
                                  style={{ background: avatarColor(p) }}
                                >
                                  {initials(m.name)}
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate font-medium" title={m.name}>{m.name}</div>
                                  <div className="truncate font-mono text-[10px] text-muted-foreground">{m.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-2.5 text-right tabular-nums">{formatCost(est.costPerMessage)}</td>
                            <td className="p-2.5 text-right tabular-nums">{formatCost(est.dailyCost)}</td>
                            <td className="p-2.5 text-right">
                              <span className={`tabular-nums font-semibold ${isCheapest ? "text-green-400" : isPriciest ? "text-orange-400" : ""}`}>
                                {formatCost(est.monthlyCost)}
                                {isCheapest && <span className="ml-1 text-[9px]">cheapest</span>}
                                {isPriciest && <span className="ml-1 text-[9px]">priciest</span>}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                onClick={() => onToggle(m.id)}
                                className="text-muted-foreground hover:text-red-400"
                                title="Remove"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Estimates use OpenRouter list prices. Actual costs may vary with caching, discounts, and routing.
                Monthly = daily × 30.
              </p>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
