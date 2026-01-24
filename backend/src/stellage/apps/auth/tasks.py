import smtplib
from email.message import EmailMessage

from celery import shared_task
from jinja2 import Environment, FileSystemLoader

from stellage.core.settings import settings


@shared_task
def send_confirmation_email(to_email, token):
    confirmation_url = (
        f"{settings.frontend_url}/auth/register_confirm?token={token}"
    )

    env = Environment(
        loader=FileSystemLoader(settings.templates_dir)
    )
    template = env.get_template("confirmation_email.html")
    html_content = template.render(confirmation_url=confirmation_url)

    message = EmailMessage()
    message.add_alternative(html_content, subtype="html")
    message["FROM"] = settings.email_settings.email_username
    message["TO"] = to_email
    message["SUBJECT"] = "Подтверждение регистрации"

    with smtplib.SMTP_SSL(
        host=settings.email_settings.email_host,
        port=settings.email_settings.email_port,
    ) as smtp:
        smtp.login(
            user=settings.email_settings.email_username,
            password=settings.email_settings.email_password.get_secret_value(),
        )
        smtp.send_message(message)
