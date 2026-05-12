import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { TooltipProvider } from "@/components/ui/tooltip"
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
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  )
}
