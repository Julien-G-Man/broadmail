import structlog

from app.core.config import settings
from app.sending.provider import BaseEmailProvider, EmailMessage, SendResult
from app.sending.resend_provider import ResendProvider
from app.sending.smtp_provider import SMTPProvider

logger = structlog.get_logger()


def get_resend_provider() -> ResendProvider | None:
    if settings.RESEND_API_KEY:
        return ResendProvider(api_key=settings.RESEND_API_KEY)
    return None


def get_smtp_provider() -> SMTPProvider | None:
    if settings.SMTP_HOST:
        return SMTPProvider(
            host=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            use_tls=settings.SMTP_USE_TLS,
        )
    return None


async def send_batch_with_fallback(messages: list[EmailMessage]) -> list[SendResult]:
    resend_provider = get_resend_provider()
    if resend_provider:
        try:
            results = await resend_provider.send_batch(messages)
            # Check if all failed
            if any(r.success for r in results):
                return results
            logger.warning("resend_all_failed_falling_back_to_smtp")
        except Exception as e:
            logger.warning("resend_exception_falling_back", error=str(e))

    smtp_provider = get_smtp_provider()
    if smtp_provider:
        return await smtp_provider.send_batch(messages)

    raise RuntimeError("No email provider configured")
