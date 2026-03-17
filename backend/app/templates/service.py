import re
import uuid
from dataclasses import dataclass

import bleach
import jinja2
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.templates.models import EmailTemplate
from app.templates.schemas import TemplateCreate, TemplateUpdate

# Used only for sanitizing text-mode templates (basic rich text from user)
ALLOWED_TAGS = list(bleach.sanitizer.ALLOWED_TAGS) + [
    "p", "br", "h1", "h2", "h3", "h4", "h5", "h6",
    "div", "span", "table", "thead", "tbody", "tr", "td", "th",
    "img", "a", "ul", "ol", "li", "strong", "em", "u", "s",
    "blockquote", "pre", "code", "hr", "figure", "figcaption",
]
ALLOWED_ATTRIBUTES = {
    **bleach.sanitizer.ALLOWED_ATTRIBUTES,
    "*": ["class", "id"],
    "a": ["href", "title", "target", "rel"],
    "img": ["src", "alt", "width", "height"],
    "td": ["colspan", "rowspan", "align", "valign"],
    "th": ["colspan", "rowspan", "align", "valign"],
}


@dataclass
class RenderedEmail:
    subject: str
    html: str
    text: str


def extract_variables(content: str, subject: str) -> list[str]:
    pattern = r'\{\{\s*(\w+)\s*\}\}'
    return list(set(re.findall(pattern, content + subject)))


def sanitize_html(html: str) -> str:
    """Light sanitization for text-mode content (no inline styles needed)."""
    return bleach.clean(html, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRIBUTES, strip=False)


def _prepare_html(html_body: str, mode: str) -> str:
    """For text mode, apply sanitization. For custom mode, trust the user's HTML as-is."""
    if mode == "custom":
        return html_body
    return sanitize_html(html_body)


def render_template_with_context(template: EmailTemplate, context: dict) -> RenderedEmail:
    env = jinja2.Environment(autoescape=True, undefined=jinja2.Undefined)
    subject = env.from_string(template.subject).render(context)
    html = env.from_string(template.html_body).render(context)
    text = env.from_string(template.text_body or "").render(context)
    return RenderedEmail(subject=subject, html=html, text=text)


async def create_template(db: AsyncSession, data: TemplateCreate, created_by: uuid.UUID) -> EmailTemplate:
    html = _prepare_html(data.html_body, data.mode)
    variables = extract_variables(html, data.subject)
    template = EmailTemplate(
        name=data.name,
        subject=data.subject,
        html_body=html,
        text_body=data.text_body,
        variables=variables,
        mode=data.mode,
        created_by=created_by,
    )
    db.add(template)
    await db.flush()
    await db.refresh(template)
    return template


async def list_templates(db: AsyncSession) -> list[EmailTemplate]:
    result = await db.execute(select(EmailTemplate).order_by(EmailTemplate.created_at.desc()))
    return result.scalars().all()


async def get_template(db: AsyncSession, template_id: uuid.UUID) -> EmailTemplate | None:
    result = await db.execute(select(EmailTemplate).where(EmailTemplate.id == template_id))
    return result.scalar_one_or_none()


async def update_template(db: AsyncSession, template: EmailTemplate, data: TemplateUpdate) -> EmailTemplate:
    if data.mode is not None:
        template.mode = data.mode
    if data.name is not None:
        template.name = data.name
    if data.subject is not None:
        template.subject = data.subject
    if data.html_body is not None:
        mode = data.mode or template.mode
        template.html_body = _prepare_html(data.html_body, mode)
    if data.text_body is not None:
        template.text_body = data.text_body
    template.variables = extract_variables(template.html_body, template.subject)
    await db.flush()
    await db.refresh(template)
    return template


async def delete_template(db: AsyncSession, template: EmailTemplate) -> None:
    await db.delete(template)
    await db.flush()


def preview_with_sample(template: EmailTemplate, sample_contact: dict) -> RenderedEmail:
    context = {
        "first_name": sample_contact.get("first_name", "John"),
        "last_name": sample_contact.get("last_name", "Doe"),
        "email": sample_contact.get("email", "john@example.com"),
        **{k: v for k, v in sample_contact.items() if k not in ("first_name", "last_name", "email")},
    }
    return render_template_with_context(template, context)
