import { MotionProvider } from "@/components/providers/motion-provider";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { PageTransition } from "@/components/motion/page-transition";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Preloader } from "@/components/layout/preloader";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartAbandonmentWatcher } from "@/components/cart/cart-abandonment-watcher";
import { Chatbot } from "@/components/chat/chatbot";

/**
 * The public storefront shell. Split out of the root layout so /admin can
 * render without the header, preloader, smooth scrolling or page transitions.
 */
export default function StorefrontLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <MotionProvider>
      <SmoothScroll>
        <Preloader />

        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
        >
          Skip to content
        </a>

        <Header />

        <main id="main" className="min-h-screen">
          <PageTransition>{children}</PageTransition>
        </main>

        <Footer />

        <CartDrawer />
        <CartAbandonmentWatcher />
        <Chatbot />
      </SmoothScroll>
    </MotionProvider>
  );
}
