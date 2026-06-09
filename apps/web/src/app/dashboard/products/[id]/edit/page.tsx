"use client";

import { useRouter } from "next/navigation";
import { use } from "react";

import { ProductForm } from "@/features/products/components/product-form";
import { useProduct } from "@/features/products/hooks/use-product";
import { useUpdateProduct } from "@/features/products/hooks/use-update-product";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default function EditProductPage({ params }: EditProductPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: product, isLoading, isError } = useProduct(id);
  const { mutate, isPending, error } = useUpdateProduct(id);

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  if (isError || !product) {
    return <p className="text-destructive text-sm">Product not found.</p>;
  }

  return (
    <div className="max-w-xl">
      <h2 className="mb-6 text-xl font-semibold tracking-tight">Edit product</h2>

      <ProductForm
        initialValues={{
          name: product.name,
          website: product.website ?? undefined,
          description: product.description ?? undefined,
          audience: product.audience ?? undefined,
          competitors: product.competitors ?? undefined,
        }}
        onSubmit={(values) =>
          mutate(values, {
            onSuccess: () => router.push(`/dashboard/products/${id}`),
          })
        }
        isSubmitting={isPending}
        submitLabel="Save changes"
        error={error?.message}
      />
    </div>
  );
}
