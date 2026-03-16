import resend
import structlog

from app.sending.provider import BaseEmailProvider, EmailMessage, SendResult

logger = structlog.get_logger()


class ResendProvider(BaseEmailProvider):
    def __init__(self, api_key: str):
        resend.api_key = api_key

    async def send_batch(self, messages: list[EmailMessage]) -> list[SendResult]:
        results = []
        for msg in messages:
            try:
                params: resend.Emails.SendParams = {
                    "from": f"{msg.from_name} <{msg.from_email}>",
                    "to": [msg.to_email],
                    "subject": msg.subject,
                    "html": msg.html,
                    "text": msg.text or None,
                    "reply_to": msg.reply_to or msg.from_email,
                }
                response = resend.Emails.send(params)
                results.append(SendResult(success=True, provider_id=response.get("id")))
            except Exception as e:
                logger.error("resend_send_error", error=str(e), to=msg.to_email)
                results.append(SendResult(success=False, error=str(e)))
        return results
