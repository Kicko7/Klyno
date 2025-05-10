import { Toaster } from "@/components/ui/sonner"
import { ModeProvider } from "@/components/utility/ModeContext"
import { GlobalState } from "@/components/utility/global-state"
import { Providers } from "@/components/utility/providers"
import TranslationsProvider from "@/components/utility/translations-provider"
import initTranslations from "@/lib/i18n"
import { Database } from "@/supabase/types"
import { createServerClient } from "@supabase/ssr"
import { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { cookies } from "next/headers"
import { ReactNode } from "react"
import { KlynoContextProvider } from "@/components/chat/klyno-context-provider" // ✅ ADDED
import "./globals.css"
import { UserProvider } from "@/context/user-context"

const inter = Inter({ subsets: ["latin"] })
const APP_NAME = "Klyno AI"
const APP_DEFAULT_TITLE = "Klyno AI"
const APP_TITLE_TEMPLATE = "%s - Klyno AI"
const APP_DESCRIPTION = "Klyno AI PWA!"

interface RootLayoutProps {
  children: ReactNode
  params: {
    locale: string
  }
}

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: APP_DEFAULT_TITLE
  },
  formatDetection: {
    telephone: false
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE
    },
    description: APP_DESCRIPTION
  },
  twitter: {
    card: "summary",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE
    },
    description: APP_DESCRIPTION
  }
}

export const viewport: Viewport = {
  themeColor: "#000000"
}

const i18nNamespaces = ["translation"]

export default async function RootLayout({
  children,
  params: { locale }
}: RootLayoutProps) {
  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )
  const session = (await supabase.auth.getSession()).data.session

  const { t, resources } = await initTranslations(locale, i18nNamespaces)

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ModeProvider>
          <Providers attribute="class" defaultTheme="dark">
            <TranslationsProvider
              namespaces={i18nNamespaces}
              locale={locale}
              resources={resources}
            >
              <KlynoContextProvider>
                {" "}
                {/* ✅ CONTEXT WRAPPED SAFELY */}
                <Toaster richColors position="top-center" duration={3000} />
                <UserProvider>
                  <div className="bg-background text-foreground flex h-dvh flex-col items-center overflow-x-auto">
                    {session ? <GlobalState>{children}</GlobalState> : children}
                  </div>
                </UserProvider>
              </KlynoContextProvider>
            </TranslationsProvider>
          </Providers>
        </ModeProvider>
      </body>
    </html>
  )
}
