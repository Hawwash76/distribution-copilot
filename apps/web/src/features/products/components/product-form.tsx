"use client";

import { useState } from "react";
import { createProductSchema, type CreateProductInput } from "@distribution-copilot/shared";

interface ProductFormProps {
  initialValues?: Partial<CreateProductInput>;
  onSubmit: (values: CreateProductInput) => void;
  isSubmitting: boolean;
  submitLabel: string;
  error?: string;
}

const inputClass =
  "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

const textareaClass = `${inputClass} min-h-[80px] resize-y`;

/** Shared form for both product creation and editing. */
export function ProductForm({
  initialValues = {},
  onSubmit,
  isSubmitting,
  submitLabel,
  error,
}: ProductFormProps) {
  const [name, setName] = useState(initialValues.name ?? "");
  const [website, setWebsite] = useState(initialValues.website ?? "");
  const [description, setDescription] = useState(initialValues.description ?? "");
  const [audience, setAudience] = useState(initialValues.audience ?? "");
  const [competitors, setCompetitors] = useState(initialValues.competitors ?? "");
  const [validationError, setValidationError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError("");

    const values = {
      name,
      website: website || undefined,
      description: description || undefined,
      audience: audience || undefined,
      competitors: competitors || undefined,
    };

    const result = createProductSchema.safeParse(values);
    if (!result.success) {
      setValidationError(result.error.errors[0]?.message ?? "Validation failed");
      return;
    }

    onSubmit(result.data);
  }

  const displayError = error ?? validationError;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">
          Name <span className="text-destructive">*</span>
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          placeholder="My SaaS Product"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="website" className="text-sm font-medium">
          Website
        </label>
        <input
          id="website"
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className={inputClass}
          placeholder="https://example.com"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={textareaClass}
          placeholder="What does your product do?"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="audience" className="text-sm font-medium">
          Target Audience
        </label>
        <textarea
          id="audience"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          className={textareaClass}
          placeholder="Who is this product for?"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="competitors" className="text-sm font-medium">
          Competitors
        </label>
        <textarea
          id="competitors"
          value={competitors}
          onChange={(e) => setCompetitors(e.target.value)}
          className={textareaClass}
          placeholder="Who are your main competitors?"
        />
      </div>

      {displayError && <p className="text-destructive text-sm">{displayError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
