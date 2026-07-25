import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Package, Plus } from "lucide-react";

import { formatPrice } from "@/lib/format";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@/lib/admin/constants";
import {
  getAllCategories,
  getProductStatusCounts,
  listProducts,
} from "@/lib/admin/queries/products";
import { FilterTabs, Pagination, SearchInput, SelectFilter } from "@/components/admin/filters";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import {
  EmptyState,
  PageHeader,
  StatusBadge,
  StockBadge,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/button-link";

export const metadata: Metadata = { title: "Products" };
export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  const [{ rows, total, page, pageCount }, counts, categories] = await Promise.all([
    listProducts({
      q: params.q,
      status: params.status,
      categoryId: params.category ? Number(params.category) : undefined,
      stock: params.stock,
      sort: params.sort,
      page: params.page ? Number(params.page) : 1,
    }),
    getProductStatusCounts(),
    getAllCategories(),
  ]);

  return (
    <>
      <PageHeader title="Products" description="Create, edit and publish your catalogue.">
        <ButtonLink href="/admin/products/new" size="lg">
          <Plus className="size-4" aria-hidden />
          New product
        </ButtonLink>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "published", label: "Published", count: counts.published },
            { value: "draft", label: "Drafts", count: counts.draft },
            { value: "archived", label: "Archived", count: counts.archived },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <SearchInput placeholder="Search products…" />
          <SelectFilter
            param="category"
            label="Filter by category"
            options={[
              { value: "all", label: "All categories" },
              ...categories.map((c) => ({ value: String(c.id), label: c.name })),
            ]}
          />
          <SelectFilter
            param="stock"
            label="Filter by stock"
            options={[
              { value: "all", label: "Any stock" },
              { value: "low", label: "Low stock" },
              { value: "out", label: "Out of stock" },
            ]}
          />
          <SelectFilter
            param="sort"
            label="Sort by"
            options={[
              { value: "all", label: "Recently updated" },
              { value: "name", label: "Name A–Z" },
              { value: "price-desc", label: "Price high–low" },
              { value: "price-asc", label: "Price low–high" },
              { value: "stock", label: "Lowest stock" },
              { value: "oldest", label: "Oldest first" },
            ]}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No products found"
          description="Try clearing the filters, or create your first product."
          action={
            <ButtonLink href="/admin/products/new">
              <Plus className="size-4" aria-hidden />
              New product
            </ButtonLink>
          }
        />
      ) : (
        <>
          <TableShell>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>Status</Th>
                <Th>Price</Th>
                <Th>Stock</Th>
                <Th>Variants</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((product) => (
                <tr key={product.id} className="hover:bg-muted/50">
                  <Td>
                    <div className="flex items-center gap-3">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt=""
                          width={40}
                          height={50}
                          className="size-10 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                          <Package className="size-4 text-muted-foreground" aria-hidden />
                        </span>
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="block truncate font-medium hover:underline"
                        >
                          {product.name}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {product.categoryName ?? "Uncategorised"} · /{product.slug}
                        </p>
                      </div>
                    </div>
                  </Td>

                  <Td>
                    <StatusBadge status={product.status} />
                  </Td>

                  <Td className="tabular-nums">
                    {product.salePriceCents ? (
                      <span className="flex flex-col leading-tight">
                        <span className="font-medium text-brand">
                          {formatPrice(product.salePriceCents)}
                        </span>
                        <span className="text-xs text-muted-foreground line-through">
                          {formatPrice(product.priceCents)}
                        </span>
                      </span>
                    ) : (
                      formatPrice(product.priceCents)
                    )}
                  </Td>

                  <Td>
                    <StockBadge
                      stock={product.totalStock}
                      threshold={DEFAULT_LOW_STOCK_THRESHOLD}
                    />
                    {product.lowStockCount > 0 ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {product.lowStockCount} size{product.lowStockCount === 1 ? "" : "s"} low
                      </p>
                    ) : null}
                  </Td>

                  <Td className="text-sm text-muted-foreground">
                    {product.colorCount} colour{product.colorCount === 1 ? "" : "s"}
                    <br />
                    <span className="text-xs">{product.reviewCount} reviews</span>
                  </Td>

                  <Td className="text-right">
                    <ProductRowActions
                      id={product.id}
                      slug={product.slug}
                      status={product.status}
                      name={product.name}
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>

          <Pagination page={page} pageCount={pageCount} total={total} />
        </>
      )}
    </>
  );
}
