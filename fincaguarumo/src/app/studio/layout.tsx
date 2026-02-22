export const metadata = {
  title: "Finca Guarumo Studio",
  description: "CMS for Finca Guarumo",
  robots: "noindex, nofollow",
  metadataBase: new URL("https://fincaguarumo.com"),
  icons: {
    icon: "/favicon/icon.ico",
    apple: "/favicon/apple-touch-icon.png",
    shortcut: "/favicon/safari-pinned-tab.svg",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
