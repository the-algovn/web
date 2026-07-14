import type { Metadata } from "next"
import { JetBrains_Mono } from "next/font/google"
import { ThemeProvider } from "@algovn/ui/theme-provider"
import { SiteShell } from "@/components/site-shell"
import "./globals.css"

const jetbrainsSans = JetBrains_Mono({ variable: "--font-geist-sans", subsets: ["latin"] })
const jetbrainsMono = JetBrains_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "algovn design system",
  description: "Living documentation for @algovn/ui",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jetbrainsSans.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <SiteShell>{children}</SiteShell>
        </ThemeProvider>
      </body>
    </html>
  )
}
