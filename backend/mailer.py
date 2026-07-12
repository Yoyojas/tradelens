"""Narrow outgoing-mail interface.

The rest of the backend only ever calls send_email(to, subject, body) and
is_configured(). Swapping Gmail SMTP for SendGrid/SES later means changing
this module only.

Privacy: nothing here logs message bodies (verification codes travel in them).
"""
import smtplib
from email.message import EmailMessage

import config


class MailNotConfigured(RuntimeError):
    """Raised when MAIL_USERNAME / MAIL_APP_PASSWORD are not set."""


def is_configured():
    return bool(config.MAIL_USERNAME and config.MAIL_APP_PASSWORD)


def send_email(to, subject, body):
    """Send a plain-text email via SMTP (STARTTLS). Raises on failure."""
    if not is_configured():
        raise MailNotConfigured("mail credentials missing")
    msg = EmailMessage()
    msg["From"] = config.MAIL_DEFAULT_SENDER
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    with smtplib.SMTP(config.MAIL_SMTP_HOST, config.MAIL_SMTP_PORT, timeout=15) as smtp:
        smtp.starttls()
        smtp.login(config.MAIL_USERNAME, config.MAIL_APP_PASSWORD)
        smtp.send_message(msg)
