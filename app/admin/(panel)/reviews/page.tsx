import type { Metadata } from "next";
import { Star } from "lucide-react";

import {
  getRatingBreakdown,
  getReviewStatusCounts,
  listReviews,
} from "@/lib/admin/queries/reviews";
import { FilterTabs, Pagination, SearchInput, SelectFilter } from "@/components/admin/filters";
import { ReviewCard } from "@/components/admin/review-card";
import { EmptyState, PageHeader, Panel } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Reviews" };
export const dynamic = "force-dynamic";

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  const [{ rows, total, page, pageCount }, counts, breakdown] = await Promise.all([
    listReviews({
      q: params.q,
      // Default the queue to what needs a decision.
      status: params.status ?? "pending",
      rating: params.rating ? Number(params.rating) : undefined,
      page: params.page ? Number(params.page) : 1,
    }),
    getReviewStatusCounts(),
    getRatingBreakdown(),
  ]);

  const maxBar = Math.max(...breakdown.counts.map((c) => c.count), 1);

  return (
    <>
      <PageHeader
        title="Reviews"
        description="Approve, reject and reply to customer reviews."
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Rating summary" className="lg:col-span-1">
          <div className="flex items-center gap-3">
            <div>
              <p className="font-display text-3xl font-semibold tabular-nums">
                {breakdown.average.toFixed(1)}
              </p>
              <p className="flex items-center gap-0.5 text-brand">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={n <= Math.round(breakdown.average) ? "size-3.5 fill-current" : "size-3.5 fill-none opacity-40"}
                    aria-hidden
                  />
                ))}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{breakdown.total} approved</p>
            </div>

            <div className="flex-1 space-y-1">
              {breakdown.counts.map((c) => (
                <div key={c.rating} className="flex items-center gap-2 text-xs">
                  <span className="w-3 tabular-nums text-muted-foreground">{c.rating}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-brand"
                      style={{ width: `${(c.count / maxBar) * 100}%` }}
                    />
                  </span>
                  <span className="w-6 text-right tabular-nums text-muted-foreground">
                    {c.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <div className="lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <FilterTabs
              options={[
                { value: "pending", label: "Pending", count: counts.pending },
                { value: "approved", label: "Approved", count: counts.approved },
                { value: "rejected", label: "Rejected", count: counts.rejected },
                { value: "all", label: "All", count: counts.all },
              ]}
            />
            <div className="flex items-center gap-2">
              <SelectFilter
                param="rating"
                label="Filter by rating"
                options={[
                  { value: "all", label: "Any rating" },
                  { value: "5", label: "5 stars" },
                  { value: "4", label: "4 stars" },
                  { value: "3", label: "3 stars" },
                  { value: "2", label: "2 stars" },
                  { value: "1", label: "1 star" },
                ]}
              />
              <SearchInput placeholder="Search reviews…" />
            </div>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              title="Nothing to moderate"
              description="No reviews match this filter."
            />
          ) : (
            <>
              <div className="space-y-3">
                {rows.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
              <Pagination page={page} pageCount={pageCount} total={total} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
