"""
Authentication Middleware
Validates Bearer tokens on protected paths and sets request state.
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from services.auth_service import auth_service

PUBLIC_PATHS = [
    "/api/auth/login",
    "/api/auth/student/send-otp",
    "/api/auth/student/verify-otp",
    "/api/health",
    "/docs",
    "/openapi.json",
    "/redoc",
]

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Allow OPTIONS and public paths without token validation
        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path
        if any(path.startswith(p) for p in PUBLIC_PATHS):
            return await call_next(request)

        # Check for admin routes requiring auth
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            payload = auth_service.decode_token(token)
            if payload:
                request.state.user = payload
                return await call_next(request)

        # If it's an explicit /api/admin route without valid auth, reject
        if path.startswith("/api/admin/"):
            return JSONResponse(
                status_code=401,
                content={"detail": "Authentication required"},
            )

        return await call_next(request)
