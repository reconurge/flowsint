from fastapi import HTTPException
from flowsint_core.core.models import InvestigationUserRole
from flowsint_core.core.types import Role


def can_user(roles: list[Role], actions: list[str]) -> bool:
    """
    Vérifie si au moins un rôle de la liste autorise au moins une action de la liste.
    """
    for role in roles:
        for action in actions:
            if role == Role.OWNER:
                return True
            if role == Role.EDITOR and action in ["read", "create", "update"]:
                return True
            if role == Role.VIEWER and action == "read":
                return True
    return False


from fastapi import HTTPException


def check_investigation_permission(user_id: str, investigation_id: str, actions: list[str], db):
    role_entry = (
        db.query(InvestigationUserRole)
        .filter_by(user_id=user_id, investigation_id=investigation_id)
        .first()
    )

    if not role_entry or not can_user(role_entry.roles, actions):
        raise HTTPException(status_code=403, detail="Forbidden")
    return True
