import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import ErrorBoundary from '../components/error-boundary'
import './globals.css'

export const metadata: Metadata = {
  title: '스매시큐 - 스매시 게임 대기열 관리',
  description: '스매시 게임 대기열을 효율적으로 관리하는 웹 애플리케이션',
  keywords: ['스매시', '배드민턴', '게임', '대기열', '관리'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#2563eb" />
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}
