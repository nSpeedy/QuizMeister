import type { ReactNode } from 'react'
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'
import type { Route } from './+types/root'
import 'bootstrap/dist/css/bootstrap.min.css'
import './assets/globals.css'
import Navbar from '@/components/Navbar.tsx'
import Footer from "@/components/footer.tsx";

export function Layout({ children }: { children: ReactNode }) {
    return (
        <html lang="en">
            <head>
                <meta charSet="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
                <title>QuizMeister</title>
                <Meta />
                <Links />
            </head>
            <body>
                {children}
                <ScrollRestoration />
                <Scripts />
            </body>
        </html>
    )
}

export default function App() {
    return (
        <div className="d-flex flex-column min-vh-100">
            <Navbar />
            <main className="container-fluid py-3 flex-grow-1">
                <Outlet />
            </main>
            <Footer />
        </div>
    )
}

export function HydrateFallback() {
    return <p>Loading...</p>
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
    let message = 'Oops!'
    let details = 'An unexpected error occurred.'

    if (isRouteErrorResponse(error)) {
        message = error.status === 404 ? '404' : 'Error'
        details = error.status === 404 ? 'The requested page could not be found.' : error.statusText || details
    } else if (import.meta.env.DEV && error instanceof Error) {
        details = error.message
    }

    return (
        <main>
            <h1>{message}</h1>
            <p>{details}</p>
        </main>
    )
}
