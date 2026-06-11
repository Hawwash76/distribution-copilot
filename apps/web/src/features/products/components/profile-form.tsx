"use client";

import { useState } from "react";
import type { GeneratedProductProfile, ProductProfile } from "@distribution-copilot/shared";

import { useSaveProfile } from "@/features/products/hooks/use-save-profile";

interface ProfileFormProps {
  productId: string;
  existing: ProductProfile | null;
  onCancel: () => void;
  onSaved: () => void;
}

const FIELDS: {
  key: keyof GeneratedProductProfile;
  label: string;
  placeholder: string;
}[] = [
  {
    key: "keywords",
    label: "Keywords",
    placeholder: "simple crm\nfreelancer crm\nclient management\nlead tracking",
  },
  {
    key: "painPoints",
    label: "Pain Points",
    placeholder:
      "Forgetting to follow up with potential clients\nExpensive enterprise CRM software",
  },
  {
    key: "personas",
    label: "Customer Personas",
    placeholder: "Solo freelance developer with 5–20 active clients\nBootstrapped SaaS founder",
  },
  {
    key: "competitors",
    label: "Competitors",
    placeholder: "HubSpot\nPipedrive\nNotion",
  },
  {
    key: "useCases",
    label: "Use Cases",
    placeholder: "Tracking leads in proposal stage\nSetting follow-up reminders",
  },
  {
    key: "valueProps",
    label: "Value Props",
    placeholder: "Set up in 5 minutes\nFlat pricing under $20",
  },
];

function toLines(items: string[]): string {
  return items.join("\n");
}

function fromLines(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Inline form for manually entering or editing a product profile.
 * Each field accepts one item per line.
 */
export function ProfileForm({ productId, existing, onCancel, onSaved }: ProfileFormProps) {
  const { mutate: saveProfile, isPending } = useSaveProfile();

  const [values, setValues] = useState<Record<keyof GeneratedProductProfile, string>>({
    keywords: toLines(existing?.keywords ?? []),
    painPoints: toLines(existing?.painPoints ?? []),
    personas: toLines(existing?.personas ?? []),
    competitors: toLines(existing?.competitors ?? []),
    useCases: toLines(existing?.useCases ?? []),
    valueProps: toLines(existing?.valueProps ?? []),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: GeneratedProductProfile = {
      keywords: fromLines(values.keywords),
      painPoints: fromLines(values.painPoints),
      personas: fromLines(values.personas),
      competitors: fromLines(values.competitors),
      useCases: fromLines(values.useCases),
      valueProps: fromLines(values.valueProps),
    };
    saveProfile({ productId, data }, { onSuccess: onSaved });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        {FIELDS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="mb-1.5 block text-sm font-medium">
              {label}
              <span className="text-muted-foreground ml-1 font-normal">(one per line)</span>
            </label>
            <textarea
              value={values[key]}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              placeholder={placeholder}
              rows={5}
              className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1"
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save Profile"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="border-border hover:bg-accent rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
