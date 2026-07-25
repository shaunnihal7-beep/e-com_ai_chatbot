import type { Metadata } from "next";
import { WishlistClient } from "@/components/wishlist/wishlist-client";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Everything you have saved.",
};

export default function WishlistPage() {
  return <WishlistClient />;
}
