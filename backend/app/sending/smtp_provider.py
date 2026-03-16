import aiosmtplib
import structlog
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.sending.provider import BaseEmailProvider, EmailMessage, SendResult

logger = structlog.get_logger()


class SMTPProvider(BaseEmailProvider):
    def __init__(self, host: str, port: int, username: str, password: str, use_tls: bool):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.use_tls = use_tls

    async def send_batch(self, messages: list[EmailMessage]) -> list[SendResult]:
        results = []
        try:
            # use_tls=True means SMTPS (port 465, SSL from the start).
            # For STARTTLS (port 587), connect without SSL then call starttls().
            smtp = aiosmtplib.SMTP(hostname=self.host, port=self.port)
            await smtp.connect()
            if self.use_tls:
                await smtp.starttls()
            await smtp.login(self.username, self.password)

            for msg in messages:
                try:
                    mime_msg = MIMEMultipart("alternative")
                    mime_msg["From"] = f"{msg.from_name} <{msg.from_email}>"
                    mime_msg["To"] = msg.to_email
                    mime_msg["Subject"] = msg.subject
                    if msg.reply_to:
                        mime_msg["Reply-To"] = msg.reply_to

                    if msg.text:
                        mime_msg.attach(MIMEText(msg.text, "plain"))
                    mime_msg.attach(MIMEText(msg.html, "html"))

                    await smtp.send_message(mime_msg)
                    results.append(SendResult(success=True, provider_id=None))
                except Exception as e:
                    logger.error("smtp_send_error", error=str(e), to=msg.to_email)
                    results.append(SendResult(success=False, error=str(e)))

            await smtp.quit()
        except Exception as e:
            logger.error("smtp_connection_error", error=str(e))
            for _ in messages:
                results.append(SendResult(success=False, error=f"SMTP connection failed: {e}"))

        return results
