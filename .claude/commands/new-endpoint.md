# New Endpoint

Add a FastAPI endpoint to Stellage backend. Arguments: `$ARGUMENTS` (e.g. "GET /boxes/{id}/comments").

## Steps

1. Add route to the appropriate `router.py` in `backend/app/{domain}/`:

```python
@router.get("/{id}/comments", response_model=list[CommentResponse])
async def get_comments(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_comments(db, id, current_user.id)
```

2. Add Pydantic schemas to `schemas.py` (Request and Response models)
3. Add service method to `service.py` (business logic only, no DB calls)
4. Add repository method to `repository.py` (DB queries via SQLAlchemy)
5. Register router in `backend/app/main.py` if it's a new domain

## Patterns
- Always use `Depends(get_current_user)` for protected routes
- Return typed response models, never raw dicts
- Service calls repository, never touches DB directly
