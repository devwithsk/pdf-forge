import os
import smtplib
import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

async def send_contact_notification(name: str, email: str, topic: str, message: str):
    # Get SMTP configurations from environment
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    if not smtp_user or not smtp_password:
        print("SMTP credentials (SMTP_USER/SMTP_PASSWORD) are not configured. Skipping email notification.")
        return

    def send():
        # Setup MIME message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"New Contact Inquiry: {topic} - {name}"
        msg['From'] = smtp_user
        msg['To'] = smtp_user  # Send notification to the support team email address itself
        
        # Professional HTML template
        html_content = f"""
        <html>
        <head>
          <style>
            body {{
              font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
              color: #334155;
              background-color: #f8fafc;
              margin: 0;
              padding: 24px;
            }}
            .container {{
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 20px;
              padding: 40px;
              box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.05);
              border: 1px solid #e2e8f0;
            }}
            .header {{
              border-bottom: 2px solid #2563eb;
              padding-bottom: 20px;
              margin-bottom: 28px;
            }}
            .header h2 {{
              margin: 0;
              color: #0f172a;
              font-size: 24px;
              font-weight: 800;
              letter-spacing: -0.025em;
            }}
            .meta-table {{
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 28px;
            }}
            .meta-table td {{
              padding: 10px 0;
              vertical-align: middle;
              border-bottom: 1px solid #f1f5f9;
            }}
            .label {{
              font-weight: 700;
              color: #64748b;
              width: 130px;
              text-transform: uppercase;
              font-size: 11px;
              letter-spacing: 0.05em;
            }}
            .value {{
              color: #1e293b;
              font-size: 14px;
              font-weight: 500;
            }}
            .message-card {{
              background-color: #f8fafc;
              border-radius: 16px;
              padding: 24px;
              border: 1px solid #f1f5f9;
            }}
            .message-title {{
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
              font-size: 11px;
              letter-spacing: 0.05em;
              margin-bottom: 10px;
            }}
            .message-text {{
              color: #334155;
              font-size: 14px;
              line-height: 1.6;
              white-space: pre-wrap;
            }}
            .footer {{
              margin-top: 40px;
              text-align: center;
              font-size: 11px;
              color: #94a3b8;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>New Contact Submission</h2>
            </div>
            
            <table class="meta-table">
              <tr>
                <td class="label">Name</td>
                <td class="value">{name}</td>
              </tr>
              <tr>
                <td class="label">Email</td>
                <td class="value"><a href="mailto:{email}" style="color: #2563eb; text-decoration: none; font-weight: 600;">{email}</a></td>
              </tr>
              <tr>
                <td class="label">Support Topic</td>
                <td class="value"><span style="background-color: #dbeafe; color: #1e40af; padding: 4px 8px; rounded: 8px; font-weight: 700; font-size: 12px; border-radius: 6px;">{topic}</span></td>
              </tr>
            </table>
            
            <div class="message-card">
              <div class="message-title">Message Details</div>
              <div class="message-text">{message}</div>
            </div>
            
            <div class="footer">
              Automated Notification &bull; PDF Forge Support
            </div>
          </div>
        </body>
        </html>
        """
        msg.attach(MIMEText(html_content, 'html'))
        
        # Connect to SMTP server and send email
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_user, smtp_user, msg.as_string())
        server.quit()

    # Offload the blocking send() execution to a thread pool
    await asyncio.to_thread(send)
