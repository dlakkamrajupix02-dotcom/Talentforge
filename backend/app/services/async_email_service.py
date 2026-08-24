from app.core.logging import get_logger, log_exception_one_line
import asyncio
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = get_logger()

class AsyncEmailService:
    """async email service."""

    __slots__ = ("smtp_server","smtp_port","sender_email","sender_password","_background_tasks")

    def __init__(self):
        self.smtp_server = settings.smtp_server
        self.smtp_port = settings.smtp_port
        self.sender_email = settings.smtp_email
        self.sender_password = settings.smtp_password
        self._background_tasks = set()

    def register_task(self, method) -> bool:
        """Register background task in O(1)."""
        try:
            task = asyncio.create_task(method)
            self._background_tasks.add(task)
            task.add_done_callback(self._discard_background_task)
            return True
        except Exception as exc:
            log_exception_one_line("Email task registration failed", exc)
            return False

    def _discard_background_task(self, task: asyncio.Task) -> None:
        self._background_tasks.discard(task)
        try:
            task.result()
        except asyncio.CancelledError:
            logger.warning("Email background task was cancelled")
        except Exception as exc:
            log_exception_one_line("Email background task failed", exc)

    def send_otp_email_background(self, recipient_email: str, otp_code: str, username: str = "User", expiry_minutes: int = 5, purpose: str = "forgot_password") -> bool:
        purpose_value = (purpose or "forgot_password").strip().lower()
        if purpose_value == "mfa":
            subject = "Your MFA Verification Code - TalentForge"
            intro_text = "We received a request to verify your sign-in with MFA. Here's your one-time verification code:"
            highlight_text = "Use this code to complete your secure login."
        else:
            subject = "Your Password Reset Code - TalentForge"
            intro_text = "We received a request to reset your password. Here's your one-time verification code:"
            highlight_text = "Use this code to continue with your password reset."

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header with Logo -->
                <tr>
                    <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <img src="https://talentforge.phenomecloud.com/TalentForge-logos.png" alt="TalentForge" style="max-width: 200px; height: auto;" />
                    </td>
                </tr>
                <!-- Greeting -->
                <tr>
                    <td style="padding: 30px 40px 20px 40px;">
                        <h2 style="color: #1a1a2e; margin: 0; font-size: 24px;">Hi {username},</h2>
                        <p style="color: #666; font-size: 16px; margin-top: 10px;">{intro_text}</p>
                    </td>
                </tr>
                <!-- OTP Code -->
                <tr>
                    <td style="padding: 10px 40px 30px 40px;">
                        <div style="background: #f8f9fa; padding: 25px; text-align: center; border-radius: 10px; border: 2px solid #667eea;">
                            <h1 style="color: #000000; margin: 0; font-size: 36px; letter-spacing: 8px; font-weight: bold;">{otp_code}</h1>
                        </div>
                        <p style="color: #555; font-size: 14px; text-align: center; margin-top: 12px;">{highlight_text}</p>
                        </div>
                    </td>
                </tr>
                <!-- Expiry Info -->
                <tr>
                    <td style="padding: 0 40px 20px 40px;">
                        <p style="color: #e74c3c; font-size: 14px; text-align: center; background-color: #fdf2f2; padding: 12px; border-radius: 5px; border-left: 4px solid #e74c3c;">
                            ⏰ This code will expire in <strong>{expiry_minutes} minutes</strong>
                        </p>
                    </td>
                </tr>
                <!-- Security Tips -->
                <tr>
                    <td style="padding: 0 40px 30px 40px;">
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
                            <h3 style="color: #1a1a2e; margin: 0 0 15px 0; font-size: 16px;">🔒 Security Tips:</h3>
                            <ul style="color: #555; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
                                <li>Never share this code with anyone</li>
                                <li>This code can only be used once</li>
                                <li>TalentForge will never ask for your code via phone or email</li>
                            </ul>
                        </div>
                    </td>
                </tr>
                <!-- Support Info -->
                <tr>
                    <td style="padding: 0 40px 30px 40px;">
                        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px;">
                            <h3 style="color: #155724; margin: 0 0 10px 0; font-size: 16px;">💬 Need Help?</h3>
                            <p style="color: #155724; margin: 0; font-size: 14px; line-height: 1.6;">If you have any questions or encounter issues, please don't hesitate to contact our support team at <a href="mailto:talentforge.phenomecloud.support@gmail.com" style="color: #155724; font-weight: bold;">talentforge.phenomecloud.support@gmail.com</a>.</p>
                        </div>
                    </td>
                </tr>
                <!-- Footer -->
                <tr>
                    <td style="background-color: #1a1a2e; padding: 25px 40px; border-radius: 0 0 10px 10px; text-align: center;">
                        <p style="color: #a0a0a0; margin: 0; font-size: 12px;">© 2026 TalentForge. All rights reserved.</p>
                        <p style="color: #666; margin: 10px 0 0 0; font-size: 11px;">This is an automated message, please do not reply.</p>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

        return self.register_task(self.send_email(recipient_email, subject, html_content))


    def send_candidate_account_email(self, recipient_email: str, username: str, password: str, company_name: str) -> bool:
        """Send candidate account creation email with login credentials and button."""
        subject = f"Welcome to {company_name} - Your Candidate Account is Ready!"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header with Logo -->
                <tr>
                    <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <img src="https://talentforge.phenomecloud.com/TalentForge-logos.png" alt="TalentForge" style="max-width: 200px; height: auto;" />
                    </td>
                </tr>
                <!-- Welcome Message -->
                <tr>
                    <td style="padding: 30px 40px 20px 40px;">
                        <h2 style="color: #1a1a2e; margin: 0; font-size: 24px;">Welcome to {company_name}, {username}!</h2>
                        <p style="color: #666; font-size: 16px; margin-top: 10px;">Your candidate account has been created successfully. You can now access your assessment portal.</p>
                    </td>
                </tr>
                <!-- Login Credentials -->
                <tr>
                    <td style="padding: 0 40px 20px 40px;">
                        <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; border-left: 4px solid #667eea;">
                            <h3 style="color: #1a1a2e; margin: 0 0 15px 0; font-size: 18px;">🔐 Your Login Credentials:</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; color: #000000; font-weight: 600;">Email:</td>
                                    <td style="padding: 8px 0; color: #000000; font-family: monospace;">{recipient_email}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #000000; font-weight: 600;">Password:</td>
                                    <td style="padding: 8px 0; color: #000000; font-family: monospace;">{password}</td>
                                </tr>
                            </table>
                        </div>
                    </td>
                </tr>
                <!-- Login Button -->
                <tr>
                    <td style="padding: 0 40px 30px 40px; text-align: center;">
                        <a href="https://talentforge.phenomecloud.com/login" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #000000; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                            🚀 Login to Your Account
                        </a>
                        <p style="color: #666; font-size: 12px; margin-top: 15px; margin-bottom: 0;">If the button doesn't work, copy and paste this link into your browser:</p>
                        <p style="color: #666; font-size: 11px; margin: 5px 0 0 0; word-break: break-all;">https://talentforge.phenomecloud.com/login</p>
                    </td>
                </tr>
                <!-- Important Information -->
                <tr>
                    <td style="padding: 0 40px 20px 40px;">
                        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107;">
                            <h3 style="color: #856404; margin: 0 0 10px 0; font-size: 16px;">⚠️ Important:</h3>
                            <ul style="color: #856404; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
                                <li>Keep your login credentials secure and private</li>
                                <li>Change your password after first login for security</li>
                                <li>Contact support if you didn't expect this email</li>
                            </ul>
                        </div>
                    </td>
                </tr>
                <!-- Support Info -->
                <tr>
                    <td style="padding: 0 40px 30px 40px;">
                        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px;">
                            <h3 style="color: #155724; margin: 0 0 10px 0; font-size: 16px;">💬 Need Help?</h3>
                            <p style="color: #155724; margin: 0; font-size: 14px; line-height: 1.6;">If you have any questions or encounter issues logging in, please don't hesitate to contact our support team at <a href="mailto:talentforge.phenomecloud.support@gmail.com" style="color: #155724; font-weight: bold;">talentforge.phenomecloud.support@gmail.com</a>.</p>
                        </div>
                    </td>
                </tr>
                <!-- Footer -->
                <tr>
                    <td style="background-color: #1a1a2e; padding: 25px 40px; border-radius: 0 0 10px 10px; text-align: center;">
                        <p style="color: #a0a0a0; margin: 0; font-size: 12px;">© 2026 {company_name}. All rights reserved.</p>
                        <p style="color: #666; margin: 10px 0 0 0; font-size: 11px;">This is an automated message, please do not reply.</p>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
        
        return self.register_task(self.send_email(recipient_email, subject, html_content))

    def _build_org_admin_welcome_email(self, recipient_email: str, username: str, password: str, company_name: str) -> tuple[str, str]:
        """Build subject and HTML for the org admin welcome email."""
        subject = f"Welcome to TalentForge — Your {company_name} Admin Account is Ready"
        login_url = "https://talentforge.phenomecloud.com/login"

        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <title>{subject}</title>
        </head>
        <body style="margin:0;padding:0;background-color:#eef2f7;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
            <!-- Preheader (hidden preview text) -->
            <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
                Your {company_name} admin account is ready. Sign in to set up your organization on TalentForge.
            </div>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2f7;margin:0;padding:0;">
                <tr>
                    <td align="center" style="padding:32px 16px;">
                        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">

                            <!-- Header -->
                            <tr>
                                <td align="center" bgcolor="#4338ca" style="background-color:#4338ca;padding:36px 32px 28px 32px;">
                                    <img src="https://talentforge.phenomecloud.com/TalentForge-logos.png" alt="TalentForge" width="180" style="display:block;width:180px;max-width:180px;height:auto;margin:0 auto 20px auto;border:0;" />
                                    <p style="margin:0;color:#ffffff;font-size:13px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;">Organization Admin</p>
                                    <h1 style="margin:10px 0 0 0;color:#ffffff;font-size:26px;line-height:1.3;font-weight:700;">Welcome to TalentForge</h1>
                                    <p style="margin:10px 0 0 0;color:#e0e7ff;font-size:15px;line-height:1.5;">Your workspace for <strong style="color:#ffffff;">{company_name}</strong> is ready.</p>
                                </td>
                            </tr>

                            <!-- Greeting -->
                            <tr>
                                <td style="padding:32px 32px 8px 32px;">
                                    <p style="margin:0 0 8px 0;color:#0f172a;font-size:20px;font-weight:700;">Hello {username},</p>
                                    <p style="margin:0;color:#475569;font-size:15px;line-height:1.7;">
                                        You have been set up as the primary <strong style="color:#0f172a;">Administrator</strong> for
                                        <strong style="color:#0f172a;">{company_name}</strong>. Use the credentials below to sign in,
                                        invite your team, and start building job descriptions with AI.
                                    </p>
                                </td>
                            </tr>

                            <!-- Quick highlights -->
                            <tr>
                                <td style="padding:16px 32px 8px 32px;">
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                        <tr>
                                            <td width="33%" align="center" style="padding:8px 4px;">
                                                <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 8px;text-align:center;">
                                                    <p style="margin:0;font-size:18px;line-height:1;">👥</p>
                                                    <p style="margin:6px 0 0 0;color:#334155;font-size:12px;font-weight:600;">Manage Team</p>
                                                </div>
                                            </td>
                                            <td width="33%" align="center" style="padding:8px 4px;">
                                                <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 8px;text-align:center;">
                                                    <p style="margin:0;font-size:18px;line-height:1;">📝</p>
                                                    <p style="margin:6px 0 0 0;color:#334155;font-size:12px;font-weight:600;">Create JDs</p>
                                                </div>
                                            </td>
                                            <td width="33%" align="center" style="padding:8px 4px;">
                                                <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 8px;text-align:center;">
                                                    <p style="margin:0;font-size:18px;line-height:1;">⚡</p>
                                                    <p style="margin:6px 0 0 0;color:#334155;font-size:12px;font-weight:600;">AI Powered</p>
                                                </div>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Credentials -->
                            <tr>
                                <td style="padding:16px 32px 8px 32px;">
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;border:1px solid #dbeafe;border-radius:10px;">
                                        <tr>
                                            <td style="padding:20px 22px 8px 22px;">
                                                <p style="margin:0;color:#1e3a8a;font-size:12px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;">Your login credentials</p>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding:0 22px 16px 22px;">
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                                    <tr>
                                                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:600;width:90px;">Email</td>
                                                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px;font-weight:600;font-family:Consolas,Monaco,monospace;">{recipient_email}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:600;">Password</td>
                                                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px;font-weight:600;font-family:Consolas,Monaco,monospace;">{password}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding:8px 0;color:#64748b;font-size:13px;font-weight:600;">Role</td>
                                                        <td style="padding:8px 0;">
                                                            <span style="display:inline-block;background-color:#ede9fe;color:#5b21b6;font-size:12px;font-weight:700;padding:4px 10px;border-radius:999px;">Admin</span>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding:0 22px 18px 22px;">
                                                <p style="margin:0;color:#b45309;background-color:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:10px 12px;font-size:12px;line-height:1.5;">
                                                    <strong>Security tip:</strong> Change your password after your first login.
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Bulletproof CTA button -->
                            <tr>
                                <td align="center" style="padding:8px 32px 28px 32px;">
                                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                        <tr>
                                            <td align="center" bgcolor="#4338ca" style="background-color:#4338ca;border-radius:8px;">
                                                <a href="{login_url}" target="_blank" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:8px;line-height:1.2;mso-padding-alt:0;">
                                                    <!--[if mso]><i style="letter-spacing:24px;mso-font-width:-100%;mso-text-raise:20pt">&nbsp;</i><![endif]-->
                                                    <span style="color:#ffffff;">Access Your Dashboard</span>
                                                    <!--[if mso]><i style="letter-spacing:24px;mso-font-width:-100%">&nbsp;</i><![endif]-->
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                    <p style="margin:14px 0 0 0;color:#64748b;font-size:12px;line-height:1.5;">
                                        Or copy this link:<br />
                                        <a href="{login_url}" style="color:#4338ca;text-decoration:underline;word-break:break-all;">{login_url}</a>
                                    </p>
                                </td>
                            </tr>

                            <!-- Support -->
                            <tr>
                                <td style="padding:0 32px 28px 32px;">
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ecfdf5;border:1px solid #bbf7d0;border-radius:8px;">
                                        <tr>
                                            <td style="padding:14px 16px;">
                                                <p style="margin:0;color:#166534;font-size:13px;line-height:1.6;">
                                                    Need help getting started? Contact us at
                                                    <a href="mailto:talentforge.phenomecloud.support@gmail.com" style="color:#15803d;font-weight:700;text-decoration:none;">talentforge.phenomecloud.support@gmail.com</a>
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td bgcolor="#f8fafc" style="background-color:#f8fafc;padding:22px 32px;border-top:1px solid #e2e8f0;text-align:center;">
                                    <p style="margin:0;color:#94a3b8;font-size:12px;">© 2026 TalentForge by Phenome Cloud. All rights reserved.</p>
                                    <p style="margin:8px 0 0 0;color:#cbd5e1;font-size:11px;">This is an automated message. Please do not reply.</p>
                                </td>
                            </tr>

                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
        return subject, html_content

    def send_org_admin_welcome_email(self, recipient_email: str, username: str, password: str, company_name: str) -> bool:
        """Send a premium, first-impression welcome email specifically for a new Organization Admin."""
        subject, html_content = self._build_org_admin_welcome_email(
            recipient_email, username, password, company_name
        )
        return self.register_task(self.send_email(recipient_email, subject, html_content))

    async def send_org_admin_welcome_email_await(
        self, recipient_email: str, username: str, password: str, company_name: str
    ) -> bool:
        """Send org admin welcome email and wait for SMTP delivery to finish."""
        subject, html_content = self._build_org_admin_welcome_email(
            recipient_email, username, password, company_name
        )
        sent = await self.send_email(recipient_email, subject, html_content)
        if sent:
            logger.info(f"Org admin welcome email sent to {recipient_email} for {company_name}")
        else:
            logger.warning(f"Org admin welcome email failed for {recipient_email} ({company_name})")
        return sent

    def send_user_account_email(self, recipient_email: str, username: str, password: str, company_name: str, user_role: str) -> bool:
        """Send user account creation email with login credentials and role information."""
        subject = f"Welcome to {company_name} - Your {user_role} Account is Ready!"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header with Logo -->
                <tr>
                    <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <img src="https://talentforge.phenomecloud.com/TalentForge-logos.png" alt="TalentForge" style="max-width: 200px; height: auto;" />
                    </td>
                </tr>
                <!-- Welcome Message -->
                <tr>
                    <td style="padding: 30px 40px 20px 40px;">
                        <h2 style="color: #1a1a2e; margin: 0; font-size: 24px;">Welcome to {company_name}, {username}!</h2>
                        <p style="color: #666; font-size: 16px; margin-top: 10px;">Your {user_role} account has been created successfully. You can now access the system.</p>
                    </td>
                </tr>
                <!-- Role Information -->
                <tr>
                    <td style="padding: 0 40px 20px 40px;">
                        <div style="background-color: #e8f4fd; padding: 25px; border-radius: 8px; border-left: 4px solid #2196F3;">
                            <h3 style="color: #1565C0; margin: 0 0 15px 0; font-size: 18px;">👤 Your Role: {user_role}</h3>
                            <p style="color: #424242; margin: 0; font-size: 14px; line-height: 1.6;">You have been granted {user_role} privileges with access to relevant system features and tools.</p>
                        </div>
                    </td>
                </tr>
                <!-- Login Credentials -->
                <tr>
                    <td style="padding: 0 40px 20px 40px;">
                        <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; border-left: 4px solid #667eea;">
                            <h3 style="color: #1a1a2e; margin: 0 0 15px 0; font-size: 18px;">🔐 Your Login Credentials:</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; color: #000000; font-weight: 600;">Email:</td>
                                    <td style="padding: 8px 0; color: #000000; font-family: monospace;">{recipient_email}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #000000; font-weight: 600;">Password:</td>
                                    <td style="padding: 8px 0; color: #000000; font-family: monospace;">{password}</td>
                                </tr>
                            </table>
                        </div>
                    </td>
                </tr>
                <!-- Login Button -->
                <tr>
                    <td style="padding: 0 40px 30px 40px; text-align: center;">
                        <a href="https://talentforge.phenomecloud.com/login" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #000000; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                            🚀 Login to Your Account
                        </a>
                        <p style="color: #666; font-size: 12px; margin-top: 15px; margin-bottom: 0;">If the button doesn't work, copy and paste this link into your browser:</p>
                        <p style="color: #666; font-size: 11px; margin: 5px 0 0 0; word-break: break-all;">https://talentforge.phenomecloud.com/login</p>
                    </td>
                </tr>
                <!-- Important Information -->
                <tr>
                    <td style="padding: 0 40px 20px 40px;">
                        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107;">
                            <h3 style="color: #856404; margin: 0 0 10px 0; font-size: 16px;">⚠️ Important:</h3>
                            <ul style="color: #856404; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
                                <li>Keep your login credentials secure and private</li>
                                <li>Change your password after first login for security</li>
                                <li>Contact support if you didn't expect this email</li>
                            </ul>
                        </div>
                    </td>
                </tr>
                <!-- Support Info -->
                <tr>
                    <td style="padding: 0 40px 30px 40px;">
                        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px;">
                            <h3 style="color: #155724; margin: 0 0 10px 0; font-size: 16px;">💬 Need Help?</h3>
                            <p style="color: #155724; margin: 0; font-size: 14px; line-height: 1.6;">If you have any questions or encounter issues logging in, please don't hesitate to contact our support team at <a href="mailto:talentforge.phenomecloud.support@gmail.com" style="color: #155724; font-weight: bold;">talentforge.phenomecloud.support@gmail.com</a>.</p>
                        </div>
                    </td>
                </tr>
                <!-- Footer -->
                <tr>
                    <td style="background-color: #1a1a2e; padding: 25px 40px; border-radius: 0 0 10px 10px; text-align: center;">
                        <p style="color: #a0a0a0; margin: 0; font-size: 12px;">© 2026 {company_name}. All rights reserved.</p>
                        <p style="color: #666; margin: 10px 0 0 0; font-size: 11px;">This is an automated message, please do not reply.</p>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
        
        return self.register_task(self.send_email(recipient_email, subject, html_content))

    def send_general_email_background(self, recipient_email: str, subject: str, content: str, username: str = "User") -> bool:
        """Send a general email with company branding."""
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header with Logo -->
                <tr>
                    <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <img src="https://talentforge.phenomecloud.com/TalentForge-logos.png" alt="TalentForge" style="max-width: 200px; height: auto;" />
                    </td>
                </tr>
                <!-- Greeting -->
                <tr>
                    <td style="padding: 30px 40px 20px 40px;">
                        <h2 style="color: #1a1a2e; margin: 0; font-size: 24px;">Hi {username},</h2>
                    </td>
                </tr>
                <!-- Content -->
                <tr>
                    <td style="padding: 0 40px 30px 40px;">
                        <div style="color: #555; font-size: 15px; line-height: 1.7;">{content}</div>
                    </td>
                </tr>
                <!-- Support Info -->
                <tr>
                    <td style="padding: 0 40px 30px 40px;">
                        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px;">
                            <h3 style="color: #155724; margin: 0 0 10px 0; font-size: 16px;">💬 Need Help?</h3>
                            <p style="color: #155724; margin: 0; font-size: 14px; line-height: 1.6;">If you have any questions or encounter issues, please don't hesitate to contact our support team at <a href="mailto:talentforge.phenomecloud.support@gmail.com" style="color: #155724; font-weight: bold;">talentforge.phenomecloud.support@gmail.com</a>.</p>
                        </div>
                    </td>
                </tr>
                <!-- Footer -->
                <tr>
                    <td style="background-color: #1a1a2e; padding: 25px 40px; border-radius: 0 0 10px 10px; text-align: center;">
                        <p style="color: #a0a0a0; margin: 0; font-size: 12px;">© 2024 TalentForge. All rights reserved.</p>
                        <p style="color: #666; margin: 10px 0 0 0; font-size: 11px;">This is an automated message, please do not reply.</p>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
        return self.register_task(self.send_email(recipient_email, subject, html_content))

    async def send_platform_feedback_email_await(self, recipients: list[str], feedback) -> bool:
        stars = "★" * (feedback.rating or 0) + "☆" * (5 - (feedback.rating or 0))
        subject = f"TalentForge Feedback · {feedback.rating or '—'}/5 from {feedback.user_name}"
        tip_block = ""
        if feedback.tip:
            tip_block = f"""
            <tr><td style="padding: 0 32px 16px 32px;">
              <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px;">
                <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.04em;">Quick tip</p>
                <p style="margin:0;color:#78350f;font-size:14px;line-height:1.6;">{feedback.tip}</p>
              </div>
            </td></tr>"""
        comment_block = ""
        if feedback.comment:
            comment_block = f"""
            <tr><td style="padding: 0 32px 16px 32px;">
              <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;">Comment</p>
              <p style="margin:0;color:#334155;font-size:14px;line-height:1.6;">{feedback.comment}</p>
            </td></tr>"""

        html_content = f"""
        <!DOCTYPE html>
        <html><body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr><td style="background:linear-gradient(135deg,#312e81,#6366f1);padding:28px 32px;">
              <p style="margin:0;color:#c7d2fe;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;">Platform Feedback</p>
              <h1 style="margin:8px 0 0 0;color:#ffffff;font-size:22px;">New user pulse received</h1>
            </td></tr>
            <tr><td style="padding:24px 32px 8px 32px;">
              <p style="margin:0;font-size:28px;color:#f59e0b;letter-spacing:2px;">{stars}</p>
              <p style="margin:8px 0 0 0;font-size:14px;color:#64748b;">Rating: <strong style="color:#0f172a;">{feedback.rating or 'Not rated'}/5</strong></p>
            </td></tr>
            {comment_block}
            {tip_block}
            <tr><td style="padding:8px 32px 24px 32px;">
              <table width="100%" style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;" cellpadding="0" cellspacing="0">
                <tr><td style="padding:16px;">
                  <p style="margin:0 0 8px 0;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;">Submitted by</p>
                  <p style="margin:0;color:#0f172a;font-size:15px;font-weight:600;">{feedback.user_name}</p>
                  <p style="margin:4px 0 0 0;color:#475569;font-size:13px;">{feedback.user_email} · {feedback.user_role}</p>
                  <p style="margin:4px 0 0 0;color:#475569;font-size:13px;">Org: {feedback.org_name or '—'}</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body></html>
        """
        ok = True
        for recipient in recipients:
            sent = await self.send_email(recipient, subject, html_content)
            ok = ok and sent
        return ok

    async def send_email(self,recipient_email: str,subject: str,html_content: str,) -> bool:
        """Run SMTP safely in executor. Returns True when the message was sent."""
        try:
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None,self.smtp_send,recipient_email,subject,html_content,)
            return True
        except Exception as exc:
            log_exception_one_line("SMTP email send failed", exc, recipient=recipient_email, subject=subject)
            return False

    def smtp_send(self,recipient_email: str,subject: str,html_content: str,) -> None:
        """Synchronous SMTP transport."""
        try:
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = self.sender_email
            message["To"] = recipient_email

            message.attach(MIMEText(html_content, "html"))

            context = ssl.create_default_context()

            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.sender_email, self.sender_password)
                server.sendmail(self.sender_email,recipient_email,message.as_string())

            logger.info(f"Email sent successfully to {recipient_email}")

        except Exception:
            raise

    def test_connection(self) -> bool:
        """Test SMTP connection without sending an email."""
        try:
            context = ssl.create_default_context()
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.sender_email, self.sender_password)
            logger.info("SMTP connection test successful")
            return True
        except Exception as exc:
            logger.error(f"SMTP connection test failed: {exc}")
            return False


async_email_service = AsyncEmailService()
