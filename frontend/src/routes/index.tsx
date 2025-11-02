import { createFileRoute, Link } from '@tanstack/react-router'
import { useAuth } from '@/lib/api'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { isAuthenticated, user } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Service Template
          </h1>
          <p className="text-muted-foreground mb-8">
            A comprehensive full-stack template with authentication and monitoring
          </p>

          {isAuthenticated ? (
            <div className="space-y-4">
              <p className="text-foreground">
                Welcome back, {user?.email}!
              </p>
              <div className="space-y-2">
                <Link
                  to="/dashboard"
                  className="block w-full bg-primary text-primary-foreground py-2 px-4 rounded hover:bg-primary/90 transition-colors"
                >
                  Go to Dashboard
                </Link>
                {/* Admin Panel link removed */}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Link
                to="/auth/login"
                search={{ redirect: undefined }}
                className="block w-full bg-primary text-primary-foreground py-2 px-4 rounded hover:bg-primary/90 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/auth/register"
                className="block w-full bg-secondary text-secondary-foreground py-2 px-4 rounded hover:bg-secondary/80 transition-colors"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
