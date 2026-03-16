import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.sending.provider import EmailMessage
from app.sending.dispatcher import send_batch_with_fallback


def make_message():
    return EmailMessage(
        to_email="test@example.com",
        to_name="Test User",
        from_email="sender@example.com",
        from_name="Sender",
        reply_to="reply@example.com",
        subject="Test Subject",
        html="<p>Hello</p>",
        text="Hello",
        campaign_id="campaign-123",
        contact_id="contact-456",
    )


@pytest.mark.asyncio
async def test_dispatcher_uses_resend_when_configured():
    messages = [make_message()]
    mock_result = MagicMock(success=True, provider_id="msg_123", error=None)

    with patch("app.sending.dispatcher.settings") as mock_settings:
        mock_settings.RESEND_API_KEY = "re_test_key"
        mock_settings.SMTP_HOST = ""

        with patch("app.sending.dispatcher.ResendProvider") as MockResend:
            instance = MockResend.return_value
            instance.send_batch = AsyncMock(return_value=[mock_result])
            results = await send_batch_with_fallback(messages)
            assert len(results) == 1
            assert results[0].success is True


@pytest.mark.asyncio
async def test_dispatcher_falls_back_to_smtp_when_resend_fails():
    messages = [make_message()]
    mock_result = MagicMock(success=True, provider_id=None, error=None)

    with patch("app.sending.dispatcher.settings") as mock_settings:
        mock_settings.RESEND_API_KEY = "re_test_key"
        mock_settings.SMTP_HOST = "smtp.test.com"
        mock_settings.SMTP_PORT = 587
        mock_settings.SMTP_USER = "user"
        mock_settings.SMTP_PASSWORD = "pass"
        mock_settings.SMTP_USE_TLS = True

        with patch("app.sending.dispatcher.ResendProvider") as MockResend:
            instance = MockResend.return_value
            instance.send_batch = AsyncMock(side_effect=Exception("Resend down"))

            with patch("app.sending.dispatcher.SMTPProvider") as MockSMTP:
                smtp_instance = MockSMTP.return_value
                smtp_instance.send_batch = AsyncMock(return_value=[mock_result])

                results = await send_batch_with_fallback(messages)
                assert results[0].success is True


@pytest.mark.asyncio
async def test_dispatcher_raises_when_no_provider():
    messages = [make_message()]

    with patch("app.sending.dispatcher.settings") as mock_settings:
        mock_settings.RESEND_API_KEY = ""
        mock_settings.SMTP_HOST = ""

        with pytest.raises(RuntimeError, match="No email provider configured"):
            await send_batch_with_fallback(messages)
