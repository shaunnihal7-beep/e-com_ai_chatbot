import type { Metadata } from "next";

import { ListingPage, type ListingSearchParams } from "@/components/product/listing-page";

export const metadata: Metadata = {
  title: "All Shoes",
  description:
    "Every Veloce shoe in one place — running, training, football and basketball.",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<ListingSearchParams>;
}) {
  return <ListingPage searchParams={await searchParams} />;
}
