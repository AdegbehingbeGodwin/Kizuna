"""Supabase authentication and clinic membership dependencies."""

from dataclasses import dataclass
from typing import Optional

from fastapi import Depends, Header, HTTPException, status

from services.supabase_db import get_supabase, get_user_membership


@dataclass(frozen=True)
class AuthenticatedUser:
    user_id: str
    email: Optional[str]
    access_token: str


@dataclass(frozen=True)
class TenantContext:
    user_id: str
    email: Optional[str]
    clinic_id: str
    clinic_name: str
    role: str
    access_token: str


def _bearer_token(authorization: Optional[str]) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A Supabase access token is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Invalid authorization header.")
    return token


async def get_authenticated_user(
    authorization: Optional[str] = Header(default=None),
) -> AuthenticatedUser:
    token = _bearer_token(authorization)
    try:
        response = get_supabase().auth.get_user(token)
        user = response.user
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The Supabase session is invalid or expired.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    if not user:
        raise HTTPException(status_code=401, detail="Authenticated user not found.")
    return AuthenticatedUser(
        user_id=str(user.id),
        email=user.email,
        access_token=token,
    )


async def get_tenant_context(
    user: AuthenticatedUser = Depends(get_authenticated_user),
) -> TenantContext:
    membership = get_user_membership(user.user_id)
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clinic onboarding is required.",
        )
    clinic = membership.get("clinics") or {}
    return TenantContext(
        user_id=user.user_id,
        email=user.email,
        clinic_id=membership["clinic_id"],
        clinic_name=clinic.get("name") or "Kizuna Clinic",
        role=membership["role"],
        access_token=user.access_token,
    )


def require_roles(*allowed_roles: str):
    async def dependency(
        context: TenantContext = Depends(get_tenant_context),
    ) -> TenantContext:
        if context.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your clinic role does not allow this action.",
            )
        return context

    return dependency
