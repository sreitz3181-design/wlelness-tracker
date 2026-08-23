import './globals.css'
import NavBar from '../components/NavBar'
import AuthGate from '../components/AuthGate'

export const metadata = {
  title: 'Wellness Tracker',
  description: 'Daily physical, mental, and spiritual check-ins.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-paper text-ink">
        <AuthGate>
          <div className="mx-auto max-w-md pb-24 md:max-w-2xl">
            {children}
          </div>
          <NavBar />
        </AuthGate>
      </body>
    </html>
  )
}
