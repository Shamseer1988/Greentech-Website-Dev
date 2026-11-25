import logging
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr
from urllib.parse import quote

from app.core.config import settings
from app.models import Enquiry, Viewing

logger = logging.getLogger(__name__)
TIMEOUT = 20


def one_line(text: str) -> str:
    """Headers must stay on one line, whatever the visitor typed."""
    return " ".join(text.split())


def enquiry_email(enquiry: Enquiry) -> EmailMessage:
    site = settings.site_url.rstrip("/")
    code = enquiry.property.code if enquiry.property else None
    wanted = (enquiry.looking_for or "").replace("-", " ")
    greeting = f"Hello {enquiry.name}, thank you for contacting Green Tech Real Estate Broker"
    greeting += f" about property {code}." if code else "."
    rows = [
        ("Reference", f"#{enquiry.id}"),
        ("Name", enquiry.name),
        ("Company", enquiry.company),
        ("Phone", enquiry.phone),
        ("Email", enquiry.email),
        ("Property", f"{code} - {site}/properties/{code}" if code else ""),
        ("Looking for", wanted),
        ("Area", enquiry.area),
        ("Staff / space", enquiry.space_needed),
        ("Reply on WhatsApp", "Yes" if enquiry.reply_on_whatsapp else "No"),
    ]
    lines = [f"{name}: {value}" for name, value in rows if value]
    if enquiry.message:
        lines += ["", "Message:", enquiry.message]
    lines += [
        "",
        "Reply on WhatsApp:",
        f"https://wa.me/{enquiry.phone.lstrip('+')}?text={quote(greeting)}",
        "",
        f"Open in the admin panel: {site}/admin/enquiries",
    ]

    message = EmailMessage()
    parts = [f"New enquiry #{enquiry.id}", code or wanted, one_line(enquiry.name)]
    message["Subject"] = " - ".join(part for part in parts if part)
    message["From"] = formataddr(("Green Tech Website", settings.mail_from))
    message["To"] = ", ".join(settings.enquiry_email_to)
    if enquiry.email:
        message["Reply-To"] = enquiry.email
    message.set_content("\n".join(lines))
    return message


def send(message: EmailMessage) -> None:
    tls = ssl.create_default_context()
    if settings.smtp_security == "ssl":
        server = smtplib.SMTP_SSL(
            settings.smtp_host, settings.smtp_port, timeout=TIMEOUT, context=tls
        )
    else:
        server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=TIMEOUT)
    with server:
        if settings.smtp_security == "starttls":
            server.starttls(context=tls)
        if settings.smtp_username:
            server.login(settings.smtp_username, settings.smtp_password.get_secret_value())
        server.send_message(message)


def notify(enquiry: Enquiry) -> None:
    """Runs after the visitor got the answer. If it fails, the enquiry is still saved."""
    try:
        send(enquiry_email(enquiry))
    except Exception:
        logger.exception("Could not send the email for enquiry %s", enquiry.id)


def viewing_email(viewing: Viewing) -> EmailMessage:
    site = settings.site_url.rstrip("/")
    code = viewing.property.code if viewing.property else ""
    rows = [
        ("Reference", f"V{viewing.id}"),
        ("Property", f"{code} - {site}/properties/{code}"),
        ("Date", f"{viewing.day:%A %d %B %Y}"),
        ("Time", viewing.time),
        ("Name", viewing.name),
        ("Company", viewing.company),
        ("Phone", viewing.phone),
        ("Email", viewing.email),
        ("People", viewing.people),
        ("Note", viewing.note),
    ]
    lines = [f"{name}: {value}" for name, value in rows if value]
    lines += ["", f"Confirm it in the admin panel: {site}/admin/viewings"]
    message = EmailMessage()
    message["Subject"] = (
        f"New viewing {code} - {viewing.day:%d %b} {viewing.time} - {one_line(viewing.name)}"
    )
    message["From"] = formataddr(("Green Tech Website", settings.mail_from))
    message["To"] = ", ".join(settings.enquiry_email_to)
    if viewing.email:
        message["Reply-To"] = viewing.email
    message.set_content("\n".join(lines))
    return message


def notify_viewing(viewing: Viewing) -> None:
    try:
        send(viewing_email(viewing))
    except Exception:
        logger.exception("Could not send the email for viewing %s", viewing.id)
