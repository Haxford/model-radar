"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Star,
  Copy,
  Check,
  Wrench,
  Braces,
  Globe,
  Eye,
  Image as ImageIcon,
  Volume2,
  Video,
  Brain,
  FileCode,
} from "lucide-react";
import {
  type OpenRouterModel,
  providerOf,
  labLabel,
  pricePerM,
  formatPrice,
  valueScore,
  worthTrying,
  isNew,
  isReasoning,
  isMandatoryReasoning,
  isVariablePricing,
  BIG_LABS,
  modalityShort,
  avatarColor,
  initials,
  getCapabilities,
  litellmSingleModel,
} from "@/lib/model-utils";

interface ModelCardProps {
  model: OpenRouterModel;
  bookmarked: boolean;
  onToggleBookmark: (id: string) => void;
}

export function ModelCard({ model, bookmarked, onToggleBookmark }: ModelCardProps) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedYaml, setCopiedYaml] = useState(false);

  const p = providerOf(model.id);
  const inCost = pricePerM(model.pricing?.prompt);
  const outCost = pricePerM(model.pricing?.completion);
  const v = valueScore(model);
  const worth = worthTrying(model);
  const fresh = isNew(model);
  const reason = isReasoning(model);
  const mandatoryReason = isMandatoryReasoning(model);
  const cheap = inCost !== null && outCost !== null && (inCost + outCost) / 2 < 1;
  const variablePricing = isVariablePricing(model);
  const bigLab = BIG_LABS.has(p);
  const caps = getCapabilities(model);

  const meterColor = v >= 70 ? "bg-green-500" : v >= 45 ? "bg-yellow-500" : "bg-red-500";

  const copyId = () => {
    navigator.clipboard.writeText(model.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1500);
  };

  const copyYaml = () => {
    navigator.clipboard.writeText(litellmSingleModel(model));
    setCopiedYaml(true);
    setTimeout(() => setCopiedYaml(false), 1500);
  };

  // Capability icons
  const capIcons: { icon: React.ReactNode; label: string; show: boolean }[] = [
    { icon: <Wrench className="h-3.5 w-3.5" />, label: "Tool calling", show: caps.tools },
    { icon: <Braces className="h-3.5 w-3.5" />, label: "Structured output", show: caps.structured },
    { icon: <Globe className="h-3.5 w-3.5" />, label: "Web search", show: caps.webSearch },
    { icon: <Eye className="h-3.5 w-3.5" />, label: "Vision", show: caps.vision },
    { icon: <ImageIcon className="h-3.5 w-3.5" />, label: "Image gen", show: caps.imageGen },
    { icon: <Volume2 className="h-3.5 w-3.5" />, label: "Audio out", show: caps.audio },
    { icon: <Video className="h-3.5 w-3.5" />, label: "Video input", show: caps.video },
    { icon: <Brain className="h-3.5 w-3.5" />, label: "Reasoning", show: caps.reasoning },
  ];
  const activeCaps = capIcons.filter((c) => c.show);

  return (
    <Card className="flex flex-col gap-3 p-4 transition-all hover:border-primary/40 hover:shadow-lg">
      {/* Top: avatar + names + bookmark */}
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
          style={{ background: avatarColor(p) }}
        >
          {initials(model.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold leading-tight" title={model.name}>
            {model.name}
          </div>
          <div className="flex items-center gap-1">
            <code className="truncate font-mono text-[11px] text-muted-foreground" title={model.id}>
              {model.id}
            </code>
            <button
              onClick={copyId}
              className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              title="Copy model ID"
            >
              {copiedId ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        </div>
        <button
          onClick={() => onToggleBookmark(model.id)}
          className="shrink-0 text-muted-foreground transition-colors hover:text-yellow-400"
          title={bookmarked ? "Remove bookmark" : "Bookmark model"}
        >
          <Star className={cn("h-5 w-5", bookmarked && "fill-yellow-400 text-yellow-400")} />
        </button>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        {fresh && (
          <Badge variant="default" className="bg-green-600 text-white">New</Badge>
        )}
        {worth && (
          <Badge variant="secondary" className="bg-blue-500/15 text-blue-400 border-blue-500/30">
            Worth Trying
          </Badge>
        )}
        {reason && (
          <Badge variant="secondary" className={
            mandatoryReason
              ? "bg-orange-500/15 text-orange-400 border-orange-500/30"
              : "bg-purple-500/15 text-purple-400 border-purple-500/30"
          }>
            {mandatoryReason ? "Reasoning" : "Thinking"}
          </Badge>
        )}
        {cheap && (
          <Badge variant="secondary" className="bg-green-500/12 text-green-400 border-green-500/28">
            Cheap
          </Badge>
        )}
        {variablePricing && (
          <Badge variant="secondary" className="bg-cyan-500/12 text-cyan-400 border-cyan-500/28">
            Variable
          </Badge>
        )}
        {bigLab && (
          <Badge variant="secondary" className="bg-yellow-500/12 text-yellow-400 border-yellow-500/28">
            Flagship
          </Badge>
        )}
      </div>

      {/* Capabilities */}
      {activeCaps.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeCaps.map((c, i) => (
            <span
              key={i}
              title={c.label}
              className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {c.icon}
              <span>{c.label}</span>
            </span>
          ))}
        </div>
      )}

      {/* Costs */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border bg-muted/40 p-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">In / 1M tok</div>
          <div className="mt-0.5 text-sm font-semibold">
            {formatPrice(inCost)}
            {inCost !== null && inCost > 0 && <span className="ml-1 text-[10px] font-normal text-muted-foreground">$/M</span>}
          </div>
        </div>
        <div className="rounded-lg border bg-muted/40 p-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Out / 1M tok</div>
          <div className="mt-0.5 text-sm font-semibold">
            {formatPrice(outCost)}
            {outCost !== null && outCost > 0 && <span className="ml-1 text-[10px] font-normal text-muted-foreground">$/M</span>}
          </div>
        </div>
      </div>
      {variablePricing && (
        <p className="text-[11px] text-muted-foreground italic">
          Dynamic routing — prices vary per endpoint
        </p>
      )}

      {/* Meta rows */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Context</span>
        <span className="font-semibold text-foreground">
          {(model.context_length || 0).toLocaleString()}
        </span>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Modality</span>
        <span className="font-semibold text-foreground">{modalityShort(model)}</span>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Provider</span>
        <span className="font-semibold text-foreground">{labLabel(p)}</span>
      </div>

      {/* Value score */}
      <div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full", meterColor)} style={{ width: `${Math.max(4, Math.min(100, v))}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
          <span>value score</span>
          <span className="font-semibold text-green-400">{v}/100</span>
        </div>
      </div>

      {/* Description */}
      {model.description && (
        <p className="line-clamp-3 text-[11.5px] leading-relaxed text-muted-foreground">
          {model.description}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <button
          onClick={copyYaml}
          className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Copy LiteLLM config YAML"
        >
          {copiedYaml ? <Check className="h-3 w-3 text-green-400" /> : <FileCode className="h-3 w-3" />}
          {copiedYaml ? "Copied!" : "LiteLLM YAML"}
        </button>
        <a
          href={`https://openrouter.ai/${model.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline"
        >
          ↗ OpenRouter
        </a>
        <a
          href={`https://openrouter.ai/api/v1/models/${model.id}/endpoints`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline"
        >
          Endpoints
        </a>
      </div>
    </Card>
  );
}
