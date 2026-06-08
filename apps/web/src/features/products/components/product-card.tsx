import Link from "next/link";
import type { Product } from "@distribution-copilot/shared";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      href={`/dashboard/products/${product.id}`}
      className="border-border bg-card hover:bg-accent/50 block rounded-lg border p-5 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{product.name}</h3>
          {product.website && (
            <p className="text-muted-foreground mt-0.5 truncate text-sm">{product.website}</p>
          )}
          {product.description && (
            <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">{product.description}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
