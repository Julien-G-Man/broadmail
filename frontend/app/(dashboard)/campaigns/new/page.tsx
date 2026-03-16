"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateCampaign } from "@/hooks/useCampaigns";
import { useTemplates } from "@/hooks/useTemplates";
import { useContactLists } from "@/hooks/useContacts";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Send, Check } from "lucide-react";

const STEPS = ["Details", "Audience", "Review"];

export default function NewCampaignPage() {
  const router = useRouter();
  const createCampaign = useCreateCampaign();
  const { data: templates } = useTemplates();
  const { data: lists } = useContactLists();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "",
    from_name: "",
    from_email: "",
    reply_to: "",
    template_id: "",
    list_ids: [] as string[],
  });

  const update = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }));

  const toggleList = (id: string) => {
    setForm((f) => ({
      ...f,
      list_ids: f.list_ids.includes(id)
        ? f.list_ids.filter((l) => l !== id)
        : [...f.list_ids, id],
    }));
  };

  const handleSubmit = async () => {
    try {
      const campaign = await createCampaign.mutateAsync({
        ...form,
        reply_to: form.reply_to || undefined,
      } as any);
      toast.success("Campaign created as draft");
      router.push(`/campaigns/${(campaign as any).id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to create campaign");
    }
  };

  const canNext = () => {
    if (step === 0) return form.name && form.from_name && form.from_email && form.template_id;
    if (step === 1) return form.list_ids.length > 0;
    return true;
  };

  return (
    <div className="max-w-2xl">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                i < step
                  ? "bg-success text-white"
                  : i === step
                  ? "bg-brand text-white"
                  : "bg-surface-3 text-text-muted"
              }`}
            >
              {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-sm ${i === step ? "font-medium text-text-primary" : "text-text-muted"}`}>
              {s}
            </span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      <div className="card p-6 space-y-4">
        {/* Step 0: Details */}
        {step === 0 && (
          <>
            <h3 className="font-semibold text-lg">Campaign Details</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Campaign Name *</label>
              <input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. February Newsletter"
                className="input"
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
              <label className="block text-sm font-medium mb-1">Reply-To Email</label>
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
              <select
                value={form.template_id}
                onChange={(e) => update("template_id", e.target.value)}
                className="input"
              >
                <option value="">Select a template…</option>
                {templates?.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Step 1: Audience */}
        {step === 1 && (
          <>
            <h3 className="font-semibold text-lg">Select Audience</h3>
            <p className="text-text-secondary text-sm">Choose which contact lists to send to.</p>
            {lists?.length === 0 ? (
              <p className="text-text-muted text-sm">No lists yet. Create a contact list first.</p>
            ) : (
              <div className="space-y-2">
                {lists?.map((lst) => (
                  <label key={lst.id} className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-surface-2">
                    <input
                      type="checkbox"
                      checked={form.list_ids.includes(lst.id)}
                      onChange={() => toggleList(lst.id)}
                      className="rounded"
                    />
                    <div>
                      <p className="text-sm font-medium">{lst.name}</p>
                      <p className="text-xs text-text-muted">{lst.member_count.toLocaleString()} contacts</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </>
        )}

        {/* Step 2: Review */}
        {step === 2 && (
          <>
            <h3 className="font-semibold text-lg">Review Campaign</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-secondary">Campaign Name</span>
                <span className="font-medium">{form.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-secondary">From</span>
                <span className="font-medium">{form.from_name} &lt;{form.from_email}&gt;</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-secondary">Template</span>
                <span className="font-medium">
                  {templates?.find((t) => t.id === form.template_id)?.name || form.template_id}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-text-secondary">Lists</span>
                <span className="font-medium">
                  {form.list_ids
                    .map((id) => lists?.find((l) => l.id === id)?.name)
                    .join(", ")}
                </span>
              </div>
            </div>
            <p className="text-xs text-text-muted mt-2">
              The campaign will be created as a draft. You can review it and send when ready.
            </p>
          </>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-2">
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="btn-ghost border border-border flex items-center gap-2 disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext()}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={createCampaign.isPending}
              className="btn-primary flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Create Campaign
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
