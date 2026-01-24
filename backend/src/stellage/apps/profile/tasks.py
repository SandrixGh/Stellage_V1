from email.message import EmailMessage

import smtplib

from celery import shared_task
from jinja2 import Environment, FileSystemLoader

from stellage.core.settings import settings


@shared_task
def send_confirmation_code(
    to_email: str,
    confirmation_code: str,
) -> None:
    env = Environment(loader=FileSystemLoader(settings.templates_dir))
    template = env.get_template("confirmation_code.html")
    html_content = template.render(confirmation_code=confirmation_code)

    message = EmailMessage()
    message.add_alternative(html_content, subtype="html")
    message["From"] = settings.email_settings.email_username
    message["To"] = to_email
    message["Subject"] = "Подтверждение новой почты"

    with smtplib.SMTP_SSL(
        host=settings.email_settings.email_host,
        port=settings.email_settings.email_port,
    ) as smtp:
        smtp.login(
            user=settings.email_settings.email_username,
            password=settings.email_settings.email_password.get_secret_value()
        )
        smtp.send_message(msg=message)