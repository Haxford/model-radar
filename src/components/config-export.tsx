"use client";

import { createPortal } from "react-dom";
import { useEffect, useState, useMemo } from "react";
import type { OpenRouterModel } from "@/lib/types";
import {
  type ConfigFormat,
  CONFIG_FORMATS,
  bulkConfig,
  singleModelConfig,
} from "@/lib/model-utils";
import { X, Copy, Check, FileCode } from "lucide-react";

interface ConfigExportProps {
  models: OpenRouterModel[];
  open: boolean;
  onClose: () => void;
  defaultFormat?: ConfigFormat;
}

export function ConfigExport({ models, open, onClose, defaultFormat = "litellm" }: ConfigExportProps) {
  const [mounted, setMounted] = useState(false);
  const [format, setFormat] = useState<ConfigFormat>(defaultFormat);
  const [copied, setCopied] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => { if (open) setFormat(defaultFormat); }, [open, defaultFormat]);

  if (!mounted || !open) return null;

  const yaml = useMemo(() => {
    if (models.length === 0) return "# No models selected";
    if (models.length === 1) return singleModelConfig(models[0], format);
    return bulkConfig(models, format);
  }, [models, format]);

  const copy = () => {
    navigator.clipboard.writeText(yaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-border bg-background shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-3">
          <FileCode className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold">Export Config</h2>
          <span className="text-xs text-muted-foreground">
            {models.length} model{models.length !== 1 ? "s" : ""}
          </span>
          <div className="flex-1" />
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Format tabs */}
        <div className="flex flex-wrap gap-1 border-b border-border px-5 py-2">
          {CONFIG_FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFormat(f.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                format === f.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {f.icon} {f.label}
            </button>
          ))}
        </div>

        {/* Code block */}
        <div className="relative flex-1 overflow-auto p-5">
          <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 text-xs">
            <code className="font-mono whitespace-pre-wrap">{yaml}</code>
          </pre>
          <button
            onClick={copy}
            className="absolute right-7 top-7 rounded-md border border-border bg-background/80 p-2 text-muted-foreground transition-colors hover:text-foreground"
            title="Copy to clipboard"
          >
            {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>

        {/* Footer with format-specific help */}
        <div className="border-t border-border px-5 py-2.5 text-[11px] text-muted-foreground">
          {format === "litellm" && "Save as config.yaml · Run: litellm --config config.yaml --port 4000"}
          {format === "hermes" && "Save to ~/.hermes/config.yaml · Or run: hermes model"}
          {format === "openclaw" && "Add to OpenClaw provider config · Supports OpenAI-compatible APIs"}
          {format === "odysseus" && "Add to Odysseus Settings → Models → Cloud/API"}
          {format === "openwebui" && "Open WebUI → Settings → Models → Add model IDs manually"}
        </div>
      </div>
    </div>,
    document.body,
  );
}
