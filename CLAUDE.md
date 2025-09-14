# Service Template

A comprehensive full-stack service template with FastAPI, React, and modern development practices. This template provides authentication and production-ready features out of the box.

## 📋 Project Notes

> **For AI Assistants**: This is a **LIVING SECTION** that serves as your notes about the specific project being built with this template. Use this space to capture and maintain context about what the user is building, their goals, technical decisions, progress, and any other relevant information that will help you provide better assistance. Update this section continuously as you learn more about the project.

### Notes About This Project

*This section should be updated by AI assistants as they learn about the project. Include information about what's being built, why, technical decisions, progress, challenges, or any other context that would be helpful for future sessions.*

---

> **Instructions for AI Assistants**: 
> - **Always read this section first** when starting work on the project
> - **Update these notes** whenever you learn something new about the project
> - **Use this context** to make informed decisions and suggestions
> - **Keep notes current** - add new insights and remove outdated information
> - **Be flexible** - adapt the content to whatever information is most relevant for this specific project
> - **Ask questions first** - if you're unsure about any project features, requirements, or implementation details before proceeding with development, ask the user for clarification

## Overview

This template implements a modern full-stack application with:

- **Backend**: FastAPI with SQLAlchemy, JWT authentication, and structured logging
- **Frontend**: React with TypeScript, TanStack Router/Query, and Tailwind CSS
- **Database**: SQLite with Alembic migrations
- **Deployment**: Docker and Docker Compose ready

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker and Docker Compose (for containerized deployment)

### Development Setup

1. **Clone and setup**:
   ```bash
   cd template
   cp .env.example .env
   # Edit .env with your JWT_SECRET and other configuration
   ```

2. **Backend setup**:
   ```bash
   cd backend
   pip install uv
   uv sync
   # Initialize database
   uv run alembic upgrade head
   # Start backend
   uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 5656
   ```

3. **Frontend setup** (in a new terminal):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the application**:
   - Frontend: http://localhost:3000 (development)
   - Backend API: http://localhost:5656
   - API Docs: http://localhost:5656/docs

### Production Deployment

1. **Using Docker Compose**:
   ```bash
   cp .env.example .env
   # Edit .env with production values
   docker-compose up -d
   ```

2. **Access the application**:
   - Application: http://localhost:5656
   - API Docs: http://localhost:5656/docs

## Architecture

### Backend Structure (Pages Pattern)

The backend follows a "pages pattern" where routes mirror frontend pages:

```
backend/app/
├── main.py                 # FastAPI app setup
├── config.py              # Configuration management
├── pages/                 # Page-specific business logic
│   ├── auth/             # Authentication endpoints
│   ├── dashboard.py      # Dashboard data endpoints
│   └── admin/           # Admin panel endpoints
├── middleware/          # HTTP middleware
├── database/           # Models and database utilities
└── functions/         # Shared business logic
```

### Frontend Structure

The frontend uses TanStack Router for file-based routing:

```
frontend/src/
├── routes/              # TanStack Router pages
│   ├── __root.tsx      # Root layout with auth
│   ├── index.tsx       # Home page
│   ├── dashboard/      # Dashboard page
│   └── auth/          # Authentication pages
├── components/         # Reusable UI components
├── lib/               # API client and utilities
└── hooks/            # Custom React hooks
```

## Key Features

### Authentication System

- **JWT-based**: Access + refresh token pattern
- **Cookie storage**: HttpOnly cookies for security
- **Role-based access**: Hierarchical role system
- **Password hashing**: bcrypt for secure password storage
- **Automatic token refresh**: Frontend automatically refreshes expired access tokens

#### Frontend Authentication Flow

The frontend implements automatic token refresh using the `fetchWithAuth` function in `frontend/src/lib/api.ts`:

```typescript
// Enhanced fetch with automatic token refresh
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, options)

  // If we get a 401, try refreshing the token and retry once
  if (response.status === 401 && url !== '/auth/refresh') {
    try {
      await fetch('/auth/refresh', { method: 'POST' })
      // Retry the original request
      return await fetch(url, options)
    } catch (refreshError) {
      // If refresh fails, redirect to login
      window.location.href = '/auth/login'
      throw new Error('Authentication failed')
    }
  }

  return response
}
```

**How it works:**
1. Intercepts all API calls that return 401 (Unauthorized)
2. Automatically calls the `/auth/refresh` endpoint to get a new access token
3. Retries the original request with the new token
4. If refresh fails, redirects user to login page

**Usage guidelines:**
- Use `fetchWithAuth()` for all authenticated API calls
- Use regular `fetch()` only for public endpoints (login, register, etc.)
- The refresh token is automatically included via HttpOnly cookies
- Never call `/auth/refresh` directly from `fetchWithAuth` to prevent infinite loops

### Pages Pattern Benefits

- **Intuitive routing**: Backend routes mirror frontend pages
- **Reduced API calls**: `onLoad` endpoints aggregate page data
- **Clear organization**: Easy to find logic for any page
- **Consistent patterns**: Every page follows onLoad/onSubmit structure

Example page implementation:
```python
@router.get("/dashboard/onload")
async def dashboard_onload(current_user: User = Depends(get_current_user)):
    # Aggregate all dashboard data in one request
    return {
        "user_stats": get_user_stats(current_user.id),
        "system_metrics": get_system_metrics()
    }
```

### Observability

- **Structured logging**: JSON-formatted logs with request correlation
- **Health checks**: Liveness and readiness endpoints

### Security Features

- **Input validation**: Pydantic models for request validation
- **CORS configuration**: Configurable CORS settings
- **Error handling**: Centralized error handling with request IDs

## Configuration

All configuration is managed through environment variables and Pydantic settings:

```python
# Key configuration options
JWT_SECRET=              # Required: JWT signing secret
ACCESS_TOKEN_TTL_MINUTES=15
REFRESH_TOKEN_TTL_DAYS=30
ENABLE_USER_REGISTRATION=true
ENABLE_ADMIN_PANEL=true
CORS_ORIGINS=["*"]      # Dev-friendly, restrict in production
```

## Database Management

### Migrations with Alembic

```bash
# Create new migration
cd backend
uv run alembic revision --autogenerate -m "description"

# Apply migrations
uv run alembic upgrade head

# View migration history
uv run alembic history
```

### Backup System

Automatic SQLite backups with optional Cloudflare R2 upload:

```python
# Local backups run daily by default
# Configure R2 for offsite backups:
ENABLE_R2_BACKUP=true
R2_ACCOUNT_ID=your-account-id
R2_BUCKET=your-backup-bucket
```

## Development Workflow

### Adding New Pages

1. **Backend**: Create route in `backend/app/pages/`
2. **Frontend**: Create page in `frontend/src/routes/`
3. **API integration**: Add endpoints to `frontend/src/lib/api.ts`

### Adding New Features

1. **Database changes**: Create Alembic migration
2. **Backend logic**: Implement in appropriate page or function
3. **Frontend UI**: Create components and integrate with API

### Adding Authenticated API Endpoints

When adding new authenticated endpoints:

1. **Backend**: Create endpoints that require authentication using `get_current_user` dependency
2. **Frontend**: Use `fetchWithAuth()` in your API client functions to ensure automatic token refresh
3. **Example**:
   ```typescript
   // In frontend/src/lib/api.ts
   async getProtectedData(): Promise<any> {
     const response = await fetchWithAuth('/api/protected-endpoint')
     if (!response.ok) {
       throw new Error('Failed to fetch protected data')
     }
     return response.json()
   }
   ```

## Production Considerations

### Security Checklist

- [ ] Change JWT_SECRET from default
- [ ] Configure CORS_ORIGINS for your domain
- [ ] Review enabled features (registration, admin panel)
- [ ] Configure HTTPS termination (reverse proxy)


### Scaling Considerations

- **Database**: Consider PostgreSQL for larger deployments
- **Caching**: Add Redis for session storage and caching
- **Load balancing**: Use reverse proxy for multiple instances

## Customization Guide

### Adding Authentication Providers

The template uses JWT but can be extended:

1. Add provider-specific endpoints in `pages/auth/`
2. Extend user model with provider fields
3. Update frontend login components

### Extending the Admin Panel

Add new admin features by:

1. Creating routes in `pages/admin/`
2. Adding role checks with `require_role("admin")`
3. Building frontend admin components


## Troubleshooting

### Common Issues

1. **Database locked**: Ensure only one process accesses SQLite
2. **CORS errors**: Check CORS_ORIGINS configuration
3. **Token refresh fails**: Verify JWT_SECRET consistency
4. **Frontend build fails**: Check Node.js version (18+ required)

### Development Tips

- **Backend logs**: Use structured logging for debugging
- **Frontend debugging**: Use React DevTools and TanStack Router DevTools
- **API testing**: Use the automatic OpenAPI docs at `/docs`

---

> **Note for AI Assistants**: If you identify functionality or patterns not covered in this documentation, please update this CLAUDE.md file with the new information to help future development and maintenance.

## File Structure Reference

```
template/
├── backend/                # FastAPI backend
│   ├── app/
│   │   ├── main.py        # Application entry point
│   │   ├── config.py      # Configuration management
│   │   ├── pages/         # Page-specific routes
│   │   ├── middleware/    # HTTP middleware
│   │   ├── database/      # Models and database utilities
│   │   └── functions/     # Shared business logic
│   ├── alembic/          # Database migrations
│   └── pyproject.toml    # Python dependencies
├── frontend/             # React frontend
│   ├── src/
│   │   ├── routes/       # TanStack Router pages
│   │   ├── components/   # Reusable UI components
│   │   ├── lib/         # API client and utilities
│   │   └── hooks/       # Custom React hooks
│   └── package.json     # Node.js dependencies
├── data/                # Persistent data (SQLite, backups)
├── docker-compose.yml   # Container orchestration
└── Dockerfile          # Container build instructions
```