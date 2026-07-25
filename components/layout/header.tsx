import { getCategoryPreviews } from "@/lib/queries/nav";
import { getSession } from "@/lib/auth";
import { HeaderClient } from "./header-client";

/**
 * Server shell for the header: resolves the mega-menu preview imagery and the
 * session once per request, then hands everything to the client component
 * that owns the interaction.
 */
export async function Header() {
  const [previews, session] = await Promise.all([getCategoryPreviews(), getSession()]);
  return <HeaderClient previews={previews} userName={session?.name ?? null} />;
}
