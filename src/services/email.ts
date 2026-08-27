export async function sendPasswordResetEmail(
  toEmail: string,
  resetUrl: string
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail =
    process.env.EMAIL_FROM || "administer2345@gmail.com";

  // Development / fallback mode if Brevo API key is not configured
  if (!apiKey || apiKey.trim() === "") {
    console.log("=================================================");
    console.log("📧 [BREVO EMAIL SERVICE - DEV/LOG MODE]");
    console.log(`To: ${toEmail}`);
    console.log(`From: ${fromEmail}`);
    console.log(`Password Reset Link: ${resetUrl}`);
    console.log("Note: BREVO_API_KEY is not configured.");
    console.log("=================================================");

    return { success: true };
  }

  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password - DBU Asset Tracking System</title>
      </head>

      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
        <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
<img
  src="https://dbu-asset-tracking.vercel.app/dbu-logo.png"
  alt="Debre Berhan University"
  width="64"
  height="64"
  style="display:block;margin:0 auto;"
/>

            <h1 style="color: #0f172a; font-size: 20px; font-weight: 800; margin-top: 16px; margin-bottom: 4px;">
              Debre Berhan University
            </h1>

            <p style="color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0;">
              Asset Tracking System
            </p>
          </div>

          <div style="height: 1px; background-color: #f1f5f9; margin-bottom: 30px;"></div>

          <h2 style="color: #1e293b; font-size: 16px; font-weight: 700; margin-bottom: 12px;">
            Password Reset Request
          </h2>

          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            We received a request to reset the password for your account
            (<strong>${toEmail}</strong>) on the DBU Asset Tracking System.
          </p>

          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 28px;">
            Click the button below to set a new password.
            This link will expire in <strong>1 hour</strong> and can only be used once.
          </p>

          <div style="text-align: center; margin-bottom: 32px;">
            <a
              href="${resetUrl}"
              style="background-color: #0b4a6e; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;"
            >
              Reset Password
            </a>
          </div>

          <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin-bottom: 24px;">
            If the button above does not work, copy and paste the following link into your web browser:
            <br><br>
            <a
              href="${resetUrl}"
              style="color: #0284c7; word-break: break-all;"
            >
              ${resetUrl}
            </a>
          </p>

          <div style="height: 1px; background-color: #f1f5f9; margin-bottom: 24px;"></div>

          <p style="color: #94a3b8; font-size: 11px; line-height: 1.5; margin: 0;">
            If you did not request a password reset, you can safely ignore this email.
            Your password will remain unchanged.
          </p>

        </div>
      </body>
      </html>
    `;
    console.log("BREVO TEST - Sending email to:", toEmail);
    console.log("BREVO TEST - From email:", fromEmail);
    console.log("BREVO TEST - API key exists:", !!apiKey);
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "DBU Asset Tracking System",
          email: fromEmail,
        },
        to: [
          {
            email: toEmail,
          },
        ],
        subject: "Reset Your Password - DBU Asset Tracking System",
        htmlContent,
      }),
    });

    const responseText = await response.text();

console.log("BREVO RESPONSE STATUS:", response.status);
console.log("BREVO RESPONSE:", responseText);

if (!response.ok) {
  console.error("Brevo Email error:", responseText);

  return {
    success: false,
    error: `Brevo email failed: ${response.status}`,
  };
}

console.log("BREVO EMAIL ACCEPTED");
return { success: true };

    return { success: true };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error
        ? err.message
        : "Failed to send email via Brevo";

    console.error("Brevo Exception:", err);

    return {
      success: false,
      error: errorMsg,
    };
  }
}