/**
* Email Sending Utility
* 
* Uses Resend to send branded emails for authentication.
* Requires RESEND_API_KEY environment variable.
*/

import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Branding constants
const BRAND = {
    name: 'SaecretHeaven',
    logo: 'https://saecretheaven.com/logo.svg',
    primaryColor: '#6366f1', // Indigo
    supportEmail: 'einar@black-knight.dev',
};

interface SendVerificationEmailParams {
    to: string;
    url: string;
    userName?: string;
}

/**
 * Send email verification email with branded template
 */
export async function sendVerificationEmail({ to, url, userName }: SendVerificationEmailParams) {
    const firstName = userName?.split(' ')[0] || 'there';

    try {
        const { data, error } = await resend.emails.send({
            from: 'SaecretHeaven <noreply@saecretheaven.com>',
            to: [to],
            subject: 'Verify your email for SaecretHeaven',
            html: generateVerificationEmailHtml({ url, firstName }),
        });

        if (error) {
            console.error('Failed to send verification email:', error);
            throw new Error(`Email send failed: ${error.message}`);
        }

        console.log('Verification email sent:', data?.id);
        return data;
    } catch (err) {
        console.error('Email service error:', err);
        throw err;
    }
}

interface SendPasswordResetEmailParams {
    to: string;
    url: string;
    userName?: string;
}

/**
 * Send password reset email with branded template
 */
export async function sendPasswordResetEmail({ to, url, userName }: SendPasswordResetEmailParams) {
    const firstName = userName?.split(' ')[0] || 'there';

    try {
        const { data, error } = await resend.emails.send({
            from: 'SaecretHeaven <noreply@saecretheaven.com>',
            to: [to],
            subject: 'Reset your SaecretHeaven password',
            html: generatePasswordResetEmailHtml({ url, firstName }),
        });

        if (error) {
            console.error('Failed to send password reset email:', error);
            throw new Error(`Email send failed: ${error.message}`);
        }

        console.log('Password reset email sent:', data?.id);
        return data;
    } catch (err) {
        console.error('Email service error:', err);
        throw err;
    }
}

/**
 * Generate HTML for verification email
 */
function generateVerificationEmailHtml({ url, firstName }: { url: string; firstName: string }) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify your email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 480px; width: 100%; border-collapse: collapse;">
                    <!-- Logo -->
                    <tr>
                        <td align="center" style="padding-bottom: 32px;">
                            <img src="${BRAND.logo}" alt="${BRAND.name}" width="60" height="60" style="display: block; border-radius: 12px;">
                        </td>
                    </tr>
                    
                    <!-- Main Card -->
                    <tr>
                        <td style="background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(99, 102, 241, 0.2);">
                            <!-- Heading -->
                            <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #ffffff; text-align: center;">
                                Verify your email
                            </h1>
                            
                            <!-- Greeting -->
                            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #a0a0a0; text-align: center;">
                                Hi ${firstName}! 👋
                            </p>
                            
                            <p style="margin: 0 0 32px; font-size: 16px; line-height: 1.6; color: #a0a0a0; text-align: center;">
                                Thanks for signing up for SaecretHeaven. Click the button below to verify your email and unlock your private photo vault.
                            </p>
                            
                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td align="center">
                                        <a href="${url}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, ${BRAND.primaryColor} 0%, #8b5cf6 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                                            Verify Email
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Link fallback -->
                            <p style="margin: 32px 0 0; font-size: 12px; line-height: 1.5; color: #666666; text-align: center;">
                                Or copy and paste this link:<br>
                                <a href="${url}" style="color: ${BRAND.primaryColor}; word-break: break-all;">${url}</a>
                            </p>
                            
                            <!-- Expiry notice -->
                            <p style="margin: 24px 0 0; font-size: 12px; color: #666666; text-align: center;">
                                This link expires in 24 hours.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding-top: 32px; text-align: center;">
                            <p style="margin: 0 0 8px; font-size: 14px; color: #666666;">
                                🔒 Your privacy is our priority
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #444444;">
                                © ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

/**
 * Generate HTML for password reset email
 */
function generatePasswordResetEmailHtml({ url, firstName }: { url: string; firstName: string }) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset your password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 480px; width: 100%; border-collapse: collapse;">
                    <!-- Logo -->
                    <tr>
                        <td align="center" style="padding-bottom: 32px;">
                            <img src="${BRAND.logo}" alt="${BRAND.name}" width="60" height="60" style="display: block; border-radius: 12px;">
                        </td>
                    </tr>
                    
                    <!-- Main Card -->
                    <tr>
                        <td style="background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(99, 102, 241, 0.2);">
                            <!-- Heading -->
                            <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #ffffff; text-align: center;">
                                Reset your password
                            </h1>
                            
                            <!-- Greeting -->
                            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #a0a0a0; text-align: center;">
                                Hi ${firstName},
                            </p>
                            
                            <p style="margin: 0 0 32px; font-size: 16px; line-height: 1.6; color: #a0a0a0; text-align: center;">
                                We received a request to reset your password. Click the button below to choose a new one.
                            </p>
                            
                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td align="center">
                                        <a href="${url}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, ${BRAND.primaryColor} 0%, #8b5cf6 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                                            Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Security notice -->
                            <p style="margin: 32px 0 0; font-size: 13px; line-height: 1.5; color: #666666; text-align: center;">
                                If you didn't request this, you can safely ignore this email.<br>
                                Your password won't be changed.
                            </p>
                            
                            <!-- Expiry notice -->
                            <p style="margin: 24px 0 0; font-size: 12px; color: #666666; text-align: center;">
                                This link expires in 1 hour.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding-top: 32px; text-align: center;">
                            <p style="margin: 0 0 8px; font-size: 14px; color: #666666;">
                                🔒 Your privacy is our priority
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #444444;">
                                © ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}
