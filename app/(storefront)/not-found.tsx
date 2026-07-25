import Link from "next/link";

import { ButtonLink } from "@/components/ui/button-link";
import { SplitWords } from "@/components/motion/reveal";
import { taxonomy } from "@/lib/taxonomy";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[80dvh] flex-col items-center justify-center py-24 text-center">
      <p className="font-display font-bold leading-none tracking-[-0.05em] text-foreground/10"
         style={{ fontSize: "clamp(6rem, 18vw, 14rem)" }}>
        404
      </p>

      <h1 className="mt-2 text-display-md">
        <SplitWords text="This page took a wrong turn." />
      </h1>

      <p className="mt-5 max-w-md text-body-lg text-muted-foreground">
        The page you were after doesn&apos;t exist, or it moved. Here is the way back.
      </p>

      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <ButtonLink className="h-12 rounded-full px-8" href="/">
          Back home
        </ButtonLink>
        <ButtonLink variant="outline" className="h-12 rounded-full px-8" href="/shop">
          Shop all
        </ButtonLink>
      </div>

      <div className="mt-12 flex flex-wrap justify-center gap-2">
        {taxonomy
          .flatMap((node) => [node, ...(node.children ?? [])])
          .map((node) => (
            <Link
              key={node.path}
              href={`/shop/${node.path}`}
              className="rounded-full border border-border px-4 py-2 text-sm transition-colors hover:border-foreground"
            >
              {node.name}
            </Link>
          ))}
      </div>
    </div>
  );
}
