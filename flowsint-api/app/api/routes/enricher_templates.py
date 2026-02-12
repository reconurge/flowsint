"""API routes for enricher templates management."""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from flowsint_core.core.models import Profile
from flowsint_core.core.postgre_db import get_db
from flowsint_core.core.services import (
    ConflictError,
    NotFoundError,
    ValidationError,
    create_enricher_template_service,
    create_template_generator_service,
)
from flowsint_core.core.template_enricher import TemplateEnricher
from flowsint_core.core.vault import Vault
from flowsint_core.templates.types import Template
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.schemas.enricher_template import (
    EnricherTemplateCreate,
    EnricherTemplateGenerateRequest,
    EnricherTemplateGenerateResponse,
    EnricherTemplateList,
    EnricherTemplateRead,
    EnricherTemplateTestRequest,
    EnricherTemplateTestResponse,
    EnricherTemplateUpdate,
)

router = APIRouter()


@router.post(
    "", response_model=EnricherTemplateRead, status_code=status.HTTP_201_CREATED
)
def create_template(
    template: EnricherTemplateCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Create a new enricher template."""
    content = template.content
    name = content.get("name", template.name)
    description = content.get("description", template.description)
    category = content.get("category", template.category)
    version = float(content.get("version", template.version))

    service = create_enricher_template_service(db)
    try:
        return service.create_template(
            name=name,
            description=description,
            category=category,
            version=version,
            content=content,
            is_public=template.is_public,
            owner_id=current_user.id,
        )
    except ConflictError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=List[EnricherTemplateList])
def list_templates(
    category: str = Query(None, description="Filter by category"),
    include_public: bool = Query(
        True, description="Include public templates from other users"
    ),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """List enricher templates."""
    service = create_enricher_template_service(db)
    return service.list_templates(current_user.id, category, include_public)


@router.post("/generate", response_model=EnricherTemplateGenerateResponse)
async def generate_template(
    request: EnricherTemplateGenerateRequest,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Generate an enricher template from a free-text description using AI."""
    service = create_template_generator_service(db)
    try:
        yaml_content = await service.generate(request.prompt, current_user.id)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return EnricherTemplateGenerateResponse(yaml_content=yaml_content)


@router.post("/{template_id}/test", response_model=EnricherTemplateTestResponse)
async def test_template(
    template_id: UUID,
    test_request: EnricherTemplateTestRequest,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Test an enricher template with a sample input value."""
    service = create_enricher_template_service(db)
    try:
        db_template = service.get_template(template_id, current_user.id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Template not found")

    try:
        content = db_template.content
        template = Template(**content)
        vault = Vault(db=db, owner_id=current_user.id)
        enricher = TemplateEnricher(
            sketch_id="123", scan_id="123", template=template, vault=vault
        )
        await enricher.async_init()
        pre = enricher.preprocess([test_request.input_value])
        results = await enricher.scan(pre)
        data = {"results": results, "raw_results": enricher.get_raw_response()}
        return EnricherTemplateTestResponse(
            success=True, data=data, status_code=200, url=template.request.url
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occured : {e}")


@router.get("/{template_id}", response_model=EnricherTemplateRead)
def get_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Get a specific enricher template by ID."""
    service = create_enricher_template_service(db)
    try:
        return service.get_template(template_id, current_user.id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Template not found")


@router.put("/{template_id}", response_model=EnricherTemplateRead)
def update_template(
    template_id: UUID,
    update_data: EnricherTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Update an enricher template. Only the owner can update."""
    service = create_enricher_template_service(db)
    try:
        return service.update_template(
            template_id=template_id,
            owner_id=current_user.id,
            update_data=update_data.model_dump(exclude_unset=True),
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Template not found")
    except ConflictError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Delete an enricher template. Only the owner can delete."""
    service = create_enricher_template_service(db)
    try:
        service.delete_template(template_id, current_user.id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Template not found")
    return None
