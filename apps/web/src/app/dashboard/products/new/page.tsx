"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ProductForm } from "@/features/products/components/product-form";
import { useCreateProduct } from "@/features/products/hooks/use-create-product";

export default function NewProductPage() {
  const router = useRouter();
  const { mutate, isPending, error } = useCreateProduct();

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <Link
          href="/dashboard/products"
          className="text-muted-foreground hover:text-foreground mb-4 inline-block text-sm transition-colors"
        >
          ← Back to products
        </Link>
        <h2 className="text-2xl font-semibold tracking-tight">Add product</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Tell us about the product you want to distribute.
        </p>
      </div>

      <ProductForm
        onSubmit={(values) =>
          mutate(values, {
            onSuccess: (product) => router.push(`/dashboard/products/${product.id}`),
          })
        }
        isSubmitting={isPending}
        submitLabel="Create product"
        error={error?.message}
      />
    </div>
  );
}
