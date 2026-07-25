import { requireAdmin } from "@/lib/admin/auth";
import { getReviewStatusCounts } from "@/lib/admin/queries/reviews";
import { getStockAlerts } from "@/lib/admin/queries/dashboard";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminTopbar } from "@/components/admin/topbar";

/**
 * Every page below this layout is behind `requireAdmin()`, which verifies the
 * cookie signature and re-checks the account on each request. Middleware only
 * does the cheap cookie-presence check on the edge.
 */
export default async function AdminPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireAdmin();

  // Badge counts live in the shell so they stay correct on every screen.
  const [reviewCounts, stockAlerts] = await Promise.all([
    getReviewStatusCounts(),
    getStockAlerts(200),
  ]);

  return (
    <div className="flex min-h-screen">
      <AdminSidebar
        pendingReviews={reviewCounts.pending}
        stockAlerts={stockAlerts.length}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar session={session} />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
