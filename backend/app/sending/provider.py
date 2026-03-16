from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class EmailMessage:
    to_email: str
    to_name: str
    from_email: str
    from_name: str
    reply_to: str | None
    subject: str
    html: str
    text: str
    campaign_id: str
    contact_id: str


@dataclass
class SendResult:
    success: bool
    provider_id: str | None = None
    error: str | None = None


class BaseEmailProvider(ABC):
    @abstractmethod
    async def send_batch(self, messages: list[EmailMessage]) -> list[SendResult]:
        ...
