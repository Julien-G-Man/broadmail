"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, Save, Maximize2, X, Code2, AlignLeft } from "lucide-react";

type Mode = "text" | "custom";

interface Props {
  initial?: {
    id?: string;
    name: string;
    subject: string;
    html_body: string;
    text_body?: string;
    mode?: string;
  };
  onSave: (data: {
    name: string;
    subject: string;
    html_body: string;
    text_body?: string;
    mode: Mode;
  }) => Promise<void>;
}

const VARIABLES = ["{{ first_name }}", "{{ last_name }}", "{{ email }}"];

// Inserts text at the cursor position of a textarea
function insertAtCursor(el: HTMLTextAreaElement, text: string) {
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const before = el.value.slice(0, start);
  const after = el.value.slice(end);
  el.value = before + text + after;
  el.selectionStart = el.selectionEnd = start + text.length;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.focus();
}

// Wraps plain text in a minimal HTML email shell
function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
  return `<!DOCTYPE html><html><body style="font-family:Inter,Arial,sans-serif;font-size:15px;color:#111;max-width:600px;margin:0 auto;padding:32px 24px;line-height:1.6">${escaped}</body></html>`;
}

export default function TemplateEditor({ initial, onSave }: Props) {
  const initialMode = (initial?.mode === "custom" ? "custom" : "text") as Mode;

  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState(initial?.name || "");
  const [subject, setSubject] = useState(initial?.subject || "");
  const [textBody, setTextBody] = useState(initial?.text_body || initial?.html_body || "");
  const [htmlBody, setHtmlBody] = useState(initial?.html_body || "");
  const [saving, setSaving] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const textRef = useRef<HTMLTextAreaElement>(null);
  const htmlRef = useRef<HTMLTextAreaElement>(null);

  // Live preview: derive iframe srcdoc from current state
  const previewDoc = mode === "custom" ? htmlBody : textToHtml(textBody);

  const insertVariable = (v: string) => {
    const ref = mode === "custom" ? htmlRef.current : textRef.current;
    if (ref) insertAtCursor(ref, v);
  };

  const handleSave = async () => {
    if (!name.trim() || !subject.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        subject: subject.trim(),
        html_body: mode === "custom" ? htmlBody : textToHtml(textBody),
        text_body: mode === "text" ? textBody : undefined,
        mode,
      });
    } finally {
      setSaving(false);
    }
  };

  // Switch mode — populate the other editor with a sensible default
  const switchMode = (next: Mode) => {
    if (next === mode) return;
    if (next === "custom" && !htmlBody && textBody) {
      setHtmlBody(textToHtml(textBody));
    }
    setMode(next);
  };

  const canSave = name.trim() && subject.trim() && (mode === "custom" ? htmlBody.trim() : textBody.trim());

  return (
    <>
      {/* Fullscreen preview overlay */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-2 shrink-0">
            <span className="text-sm font-medium text-text-primary">Preview — {name || "Untitled"}</span>
            <button
              onClick={() => setFullscreen(false)}
              className="text-text-muted hover:text-text-primary p-1 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <iframe
            srcDoc={previewDoc}
            className="flex-1 w-full border-0"
            title="Email Preview Fullscreen"
            sandbox="allow-same-origin"
          />
        </div>
      )}

      <div className="flex flex-col h-full space-y-3">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-xl font-display font-semibold">
            {initial?.id ? "Edit Template" : "New Template"}
          </h2>

          {/* Mode tabs */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => switchMode("text")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === "text"
                  ? "bg-brand text-white"
                  : "text-text-secondary hover:bg-surface-2"
              }`}
            >
              <AlignLeft className="w-3.5 h-3.5" />
              Text only
            </button>
            <button
              onClick={() => switchMode("custom")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === "custom"
                  ? "bg-brand text-white"
                  : "text-text-secondary hover:bg-surface-2"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Custom HTML
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !canSave}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Template
          </button>
        </div>

        {/* Meta fields + variable picker */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Template Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Recruitment 2026"
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Subject Line</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Hello {{ first_name }}, welcome!"
              className="input"
            />
          </div>
        </div>

        {/* Variable chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-text-muted">Insert variable:</span>
          {VARIABLES.map((v) => (
            <button
              key={v}
              onClick={() => insertVariable(v)}
              className="text-xs bg-surface-2 border border-border px-2 py-0.5 rounded font-mono hover:bg-surface-3 transition-colors"
            >
              {v}
            </button>
          ))}
        </div>

        {/* Main editor area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">

          {/* LEFT — editor */}
          <div className="flex flex-col min-h-0">
            {mode === "text" ? (
              <>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Email body <span className="text-text-muted font-normal">(plain text, supports variables)</span>
                </label>
                <textarea
                  ref={textRef}
                  value={textBody}
                  onChange={(e) => setTextBody(e.target.value)}
                  placeholder={`Hi {{ first_name }},\n\nWelcome to Enactus KNUST!\n\nBest regards,\nThe Team`}
                  className="flex-1 w-full font-mono text-sm border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-brand bg-white"
                  style={{ minHeight: "460px" }}
                />
              </>
            ) : (
              <>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  HTML source <span className="text-text-muted font-normal">(full HTML — inline styles, images, anything goes)</span>
                </label>
                <textarea
                  ref={htmlRef}
                  value={htmlBody}
                  onChange={(e) => setHtmlBody(e.target.value)}
                  placeholder={`<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body { font-family: Arial, sans-serif; }\n  </style>\n</head>\n<body>\n  <h1>Hello {{ first_name }}!</h1>\n  <img src="https://example.com/banner.png" alt="Banner" />\n  <p>Your message here.</p>\n</body>\n</html>`}
                  spellCheck={false}
                  className="flex-1 w-full font-mono text-sm border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-brand bg-[#1e1e2e] text-[#cdd6f4]"
                  style={{ minHeight: "460px" }}
                />
              </>
            )}
          </div>

          {/* RIGHT — live preview */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-text-secondary">
                Live preview <span className="text-text-muted font-normal">(updates as you type)</span>
              </label>
              <button
                onClick={() => setFullscreen(true)}
                className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
                title="Full screen preview"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Fullscreen
              </button>
            </div>
            <div className="flex-1 border border-border rounded-lg overflow-hidden bg-white" style={{ minHeight: "460px" }}>
              <iframe
                srcDoc={previewDoc || "<html><body style='display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-family:sans-serif;font-size:14px'>Start typing to see a preview</body></html>"}
                className="w-full h-full border-0"
                title="Email Preview"
                sandbox="allow-same-origin"
                style={{ minHeight: "460px" }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
