import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration"
import { ConnectionBanner } from "@/components/pwa/ConnectionBanner"
import "./globals.css"

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Nexus Trace — Streaming AI Agent",
  description: "A streaming AI agent with live tool-call trace visualization. Built by Arif Dewi.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} dark h-full antialiased`}
    >
      <body className="bg-background text-foreground h-full">
        <ConnectionBanner />
        <TooltipProvider>{children}</TooltipProvider>
        <ServiceWorkerRegistration />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
