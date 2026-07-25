import Link from "next/link";
import type { ComponentProps } from "react";

import { Button } from "./button";

/**
 * A Button that navigates.
 *
 * Base UI's Button assumes it renders a native <button> (`nativeButton`
 * defaults to true). Handing it an <a> via `render` without clearing that flag
 * strips the correct semantics and warns at runtime — so this sets it once,
 * here, rather than at ~18 call sites.
 */
export function ButtonLink({
  href,
  target,
  children,
  ...props
}: Omit<ComponentProps<typeof Button>, "render" | "nativeButton"> & {
  href: ComponentProps<typeof Link>["href"];
  target?: ComponentProps<"a">["target"];
  onClick?: ComponentProps<"a">["onClick"];
}) {
  return (
    <Button
      {...props}
      nativeButton={false}
      render={
        <Link
          href={href}
          target={target}
          // Opening in a new tab without this leaks window.opener to the target.
          rel={target === "_blank" ? "noopener noreferrer" : undefined}
        />
      }
    >
      {children}
    </Button>
  );
}
