"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateCampaign, useSendCampaign } from "@/hooks/useCampaigns";
import { useTemplates } from "@/hooks/useTemplates";
import { useContactLists } from "@/hooks/useContacts";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Send, Save, Check, Loader2 } from "lucide-react";
import Link from "next/link";

const STEPS = ["Details", "Audience", "Review"];

export default function NewCampaignPage() {
  const router = useRouter();
  const createCampaign = useCreateCampaign();
  const sendCampaign = useSendCampaign();
  const { data: templates } = useTemplates();
  const { data: lists } = useContactLists();

  const [step, setStep] = useState(0);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    name: "",
    from_name: "",
    from_email: "",
    reply_to: "",
    template_id: "",
    list_ids: [] as string[],
  });

  const update = (field: string, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

  const toggleList = (id: string) =>
    setForm((f) => ({
      ...f,
      list_ids: f.list_ids.includes(id)
        ? f.list_ids.filter((l) => l !== id)
        : [...f.list_ids, id],
    }));

  const canNext = () => {
    if (step === 0)
      return form.name && form.from_name && form.from_email && form.template_id;
    if (step === 1) return form.list_ids.length > 0;
    return true;
  };

  const buildPayload = () => ({
    name: form.name,
    from_name: form.from_name,
    from_email: form.from_email,
    reply_to: form.reply_to || undefined,
    template_id: form.template_id,
    list_ids: form.list_ids,
  });

  const handleSaveDraft = async () => {
    try {
      const campaign = await createCampaign.mutateAsync(buildPayload() as any);
      toast.success("Campaign saved as draft");
      router.push(`/dashboard/campaigns/${(campaign as any).id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to create campaign");
    }
  };

  const handleSendNow = async () => {
    setSending(true);
    try {
      const campaign = await createCampaign.mutateAsync(buildPayload() as any);
      const id = (campaign as any).id;
      await sendCampaign.mutateAsync(id);
      toast.success("Campaign is sending!");
      router.push(`/dashboard/campaigns/${id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to send campaign");
    } finally {
      setSending(false);
    }
  };

  const selectedTemplate = templates?.find((t) => t.id === form.template_id);
  const selectedLists = form.list_ids
    .map((id) => lists?.find((l) => l.id === id))
    .filter(Boolean);
  const totalRecipients = selectedLists.reduce(
    (sum, l) => sum + (l?.member_count || 0),
    0
  );

  return (
    <div className="max-w-2xl">
      {/* Back */}
      <Link
        href="/dashboard/campaigns"
        className="flex items-center gap-1 text-text-muted text-sm hover:text-text-primary mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Campaigns
      </Link>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                i < step
                  ? "bg-success text-white"
                  : i === step
                  ? "bg-brand text-white"
                  : "bg-surface-3 text-text-muted"
              }`}
            >
              {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span
              className={`text-sm ${
                i === step ? "font-medium text-text-primary" : "text-text-muted"
              }`}
            >
              {s}
            </span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-border mx-1" />}
          </div>
        ))}
      </div>

      <div className="card p-6 space-y-5">
        {/* ── Step 0: Details ── */}
        {step === 0 && (
          <>
            <h3 className="font-semibold text-base">Campaign Details</h3>

            <div>
              <label className="block text-sm font-medium mb-1">Campaign Name *</label>
              <input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Recruitment Drive 2026"
                className="input"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">From Name *</label>
                <input
                  value={form.from_name}
                  onChange={(e) => update("from_name", e.target.value)}
                  placeholder="Enactus KNUST"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">From Email *</label>
                <input
                  type="email"
                  value={form.from_email}
                  onChange={(e) => update("from_email", e.target.value)}
                  placeholder="noreply@enactusknust.com"
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Reply-To <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <input
                type="email"
                value={form.reply_to}
                onChange={(e) => update("reply_to", e.target.value)}
                placeholder="contact@enactusknust.com"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email Template *</label>
              {templates?.length === 0 ? (
                <p className="text-sm text-text-muted">
                  No templates yet.{" "}
                  <Link href="/dashboard/templates/new" className="text-brand hover:underline">
                    Create one first.
                  </Link>
                </p>
              ) : (
                <select
                  value={form.template_id}
                  onChange={(e) => update("template_id", e.target.value)}
                  className="input"
                >
                  <option value="">Select a template…</option>
                  {templates?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </>
        )}

        {/* ── Step 1: Audience ── */}
        {step === 1 && (
          <>
            <div>
              <h3 className="font-semibold text-base">Select Audience</h3>
              <p className="text-text-secondary text-sm mt-0.5">
                Choose which contact lists to include.
              </p>
            </div>

            {!lists || lists.length === 0 ? (
              <p className="text-sm text-text-muted">
                No lists yet.{" "}
                <Link href="/dashboard/contacts" className="text-brand hover:underline">
                  Import contacts first.
                </Link>
              </p>
            ) : (
              <div className="space-y-2">
                {lists.map((lst) => (
                  <label
                    key={lst.id}
                    className={`flex items-center gap-3 p-3.5 border rounded-lg cursor-pointer transition-colors ${
                      form.list_ids.includes(lst.id)
                        ? "border-brand bg-brand/5"
                        : "border-border hover:bg-surface-2"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.list_ids.includes(lst.id)}
                      onChange={() => toggleList(lst.id)}
                      className="rounded accent-brand"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{lst.name}</p>
                      {lst.description && (
                        <p className="text-xs text-text-muted">{lst.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-text-muted shrink-0">
                      {lst.member_count.toLocaleString()} contacts
                    </span>
                  </label>
                ))}
              </div>
            )}

            {form.list_ids.length > 0 && (
              <p className="text-xs text-text-secondary">
                <span className="font-medium text-text-primary">
                  ~{totalRecipients.toLocaleString()}
                </span>{" "}
                recipients selected (suppressed contacts are skipped at send time)
              </p>
            )}
          </>
        )}

        {/* ── Step 2: Review ── */}
        {step === 2 && (
          <>
            <div>
              <h3 className="font-semibold text-base">Review & Send</h3>
              <p className="text-text-secondary text-sm mt-0.5">
                Everything look right? You can send now or save as a draft.
              </p>
            </div>

            <div className="rounded-lg border border-border divide-y divide-border text-sm">
              {[
                { label: "Campaign", value: form.name },
                {
                  label: "From",
                  value: `${form.from_name} <${form.from_email}>`,
                },
                { label: "Template", value: selectedTemplate?.name || "—" },
                {
                  label: "Lists",
                  value: selectedLists.map((l) => l?.name).join(", ") || "—",
                },
                {
                  label: "Recipients",
                  value: `~${totalRecipients.toLocaleString()} (active contacts)`,
                },
              ].map((row) => (
                <div key={row.label} className="flex justify-between px-4 py-3">
                  <span className="text-text-secondary">{row.label}</span>
                  <span className="font-medium text-right max-w-[60%]">{row.value}</span>
                </div>
              ))}
            </div>

            {/* Primary action: Send Now */}
            <button
              onClick={handleSendNow}
              disabled={sending || createCampaign.isPending}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sending ? "Sending…" : `Send to ${totalRecipients.toLocaleString()} recipients`}
            </button>

            <button
              onClick={handleSaveDraft}
              disabled={sending || createCampaign.isPending}
              className="w-full btn-ghost border border-border flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Save as Draft
            </button>
          </>
        )}

        {/* Navigation */}
        {step < 2 && (
          <div className="flex justify-between pt-1">
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="btn-ghost border border-border flex items-center gap-2 disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext()}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="pt-1">
            <button
              onClick={() => setStep(1)}
              className="btn-ghost border border-border flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
