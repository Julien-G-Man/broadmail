"use client";

import { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { usePreviewTemplate } from "@/hooks/useTemplates";
import { Loader2, Save, Eye, EyeOff } from "lucide-react";

interface Props {
  initial?: {
    id?: string;
    name: string;
    subject: string;
    html_body: string;
    text_body?: string;
  };
  onSave: (data: { name: string; subject: string; html_body: string; text_body?: string }) => Promise<void>;
}

export default function TemplateEditor({ initial, onSave }: Props) {
  const [name, setName] = useState(initial?.name || "");
  const [subject, setSubject] = useState(initial?.subject || "");
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const previewMutation = usePreviewTemplate();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Write your email content here…" }),
    ],
    content: initial?.html_body || "",
    editorProps: {
      attributes: {
        class: "prose max-w-none focus:outline-none min-h-[400px] p-4",
      },
    },
  });

  const handleSave = async () => {
    if (!name.trim() || !subject.trim() || !editor) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        subject: subject.trim(),
        html_body: editor.getHTML(),
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!initial?.id || !editor) return;
    try {
      const result = await previewMutation.mutateAsync({
        id: initial.id,
        sample_contact: { first_name: "John", last_name: "Doe", email: "john@example.com" },
      });
      setPreviewHtml(result.html);
      setShowPreview(true);
    } catch {
      // Preview requires saved template
    }
  };

  const variables = ["{{ first_name }}", "{{ last_name }}", "{{ email }}"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-semibold">
          {initial?.id ? "Edit Template" : "New Template"}
        </h2>
        <div className="flex gap-2">
          {initial?.id && (
            <button
              onClick={handlePreview}
              disabled={previewMutation.isPending}
              className="btn-ghost border border-border flex items-center gap-2"
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              Preview
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !subject.trim()}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Template
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Editor Panel */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Template Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Monthly Newsletter"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subject Line</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Hello {{ first_name }}, here's your newsletter"
              className="input"
            />
          </div>

          {/* Variable picker */}
          <div>
            <p className="text-xs text-text-muted mb-2">Available variables:</p>
            <div className="flex flex-wrap gap-2">
              {variables.map((v) => (
                <button
                  key={v}
                  onClick={() => editor?.commands.insertContent(v)}
                  className="text-xs bg-surface-2 border border-border px-2 py-1 rounded hover:bg-surface-3 font-mono"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className="card border border-border overflow-hidden">
            <div className="bg-surface-2 border-b border-border px-3 py-2 flex gap-2">
              <button
                onClick={() => editor?.chain().focus().toggleBold().run()}
                className={`text-xs px-2 py-1 rounded font-bold ${editor?.isActive("bold") ? "bg-brand text-white" : "hover:bg-surface-3"}`}
              >
                B
              </button>
              <button
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                className={`text-xs px-2 py-1 rounded italic ${editor?.isActive("italic") ? "bg-brand text-white" : "hover:bg-surface-3"}`}
              >
                I
              </button>
              <button
                onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`text-xs px-2 py-1 rounded ${editor?.isActive("heading", { level: 2 }) ? "bg-brand text-white" : "hover:bg-surface-3"}`}
              >
                H2
              </button>
              <button
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                className={`text-xs px-2 py-1 rounded ${editor?.isActive("bulletList") ? "bg-brand text-white" : "hover:bg-surface-3"}`}
              >
                •List
              </button>
            </div>
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Preview Panel */}
        <div>
          <p className="text-sm font-medium mb-2">Live Preview</p>
          <div className="card border border-border overflow-hidden h-[500px] overflow-y-auto">
            {showPreview && previewHtml ? (
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full border-0"
                title="Email Preview"
              />
            ) : (
              <div className="p-4 prose max-w-none text-sm text-text-secondary">
                <p className="text-text-muted text-xs mb-3">
                  {initial?.id ? "Click Preview to see the rendered email" : "Save the template first to preview"}
                </p>
                <div dangerouslySetInnerHTML={{ __html: editor?.getHTML() || "" }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
