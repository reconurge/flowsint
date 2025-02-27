import "../../styles/globals.css";
import { Metadata, Viewport } from "next";
import clsx from "clsx";
import { Providers } from "./providers";
import { siteConfig } from "@/config/site";
import { fontSans } from "@/config/fonts";
import { ConfirmContextProvider } from "@/components/use-confirm-dialog";
import NextTopLoader from 'nextjs-toploader';
import { TooltipProvider } from "@/components/ui/tooltip";
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="en">
      <head />
      <body
        className={clsx(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
        )}
      >
        <NuqsAdapter>
          <Providers themeProps={{ attribute: "class", defaultTheme: "dark" }}>
            <main>
              <NextTopLoader color="var(--primary)" />
              <TooltipProvider>
                <ConfirmContextProvider>
                  {children}
                </ConfirmContextProvider>
                <Toaster />
              </TooltipProvider>
            </main>
          </Providers>
        </NuqsAdapter>
      </body>
    </html>
  );
}
