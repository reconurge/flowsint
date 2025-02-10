import "@/styles/globals.css";
import { Metadata, Viewport } from "next";
import clsx from "clsx";
import "@/styles/globals.css"
import { Providers } from "./providers";
import "@radix-ui/themes/styles.css";
import { siteConfig } from "@/config/site";
import { fontSans } from "@/config/fonts";
import { Theme } from "@radix-ui/themes";
import { ConfirmContextProvider } from "@/src/components/use-confirm-dialog";
import NextTopLoader from 'nextjs-toploader';

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
        <Providers themeProps={{ attribute: "class", defaultTheme: "dark" }}>
          <Theme>
            <main>
              <NextTopLoader />
              <ConfirmContextProvider>
                {children}
              </ConfirmContextProvider>
            </main>
          </Theme>
        </Providers>
      </body>
    </html>
  );
}
