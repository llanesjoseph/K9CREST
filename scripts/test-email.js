#!/usr/bin/env node

/**
 * Test Email Script
 * Sends a test email using Resend to verify configuration
 */

require('dotenv').config({ path: '.env.local' });
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendTestEmail() {
  console.log('🧪 Testing Resend Email Configuration...\n');

  // Verify API key
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ Error: RESEND_API_KEY not found in .env.local');
    process.exit(1);
  }

  console.log('✅ API Key found');
  console.log(`📧 From: ${process.env.RESEND_FROM_EMAIL || 'noreply@bugs.crucibleanalytics.dev'}`);
  console.log(`📬 To: ${process.env.BUG_REPORT_EMAIL || 'joseph@crucibleanalytics.dev'}`);
  console.log('\n📤 Sending test email...\n');

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'K9CREST Bug Hunter <noreply@bugs.crucibleanalytics.dev>',
      to: process.env.BUG_REPORT_EMAIL || 'joseph@crucibleanalytics.dev',
      subject: '🧪 Test Email - K9CREST Bug Hunter',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Test Email</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 32px;">🎉 Success!</h1>
            </div>

            <div style="background-color: #fff; padding: 30px; border: 2px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937; margin-top: 0;">Email Configuration Working!</h2>

              <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #065f46; font-weight: 600;">✅ Your K9CREST Bug Hunter is ready!</p>
              </div>

              <h3 style="color: #1f2937; margin-top: 30px;">Test Details</h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr style="background-color: #f9fafb;">
                  <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; width: 180px;">From</td>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">${process.env.RESEND_FROM_EMAIL || 'noreply@bugs.crucibleanalytics.dev'}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">To</td>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">${process.env.BUG_REPORT_EMAIL || 'joseph@crucibleanalytics.dev'}</td>
                </tr>
                <tr style="background-color: #f9fafb;">
                  <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">Domain</td>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">bugs.crucibleanalytics.dev</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">Status</td>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;"><span style="color: #10b981; font-weight: bold;">✅ Verified</span></td>
                </tr>
                <tr style="background-color: #f9fafb;">
                  <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">Sent At</td>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">${new Date().toLocaleString()}</td>
                </tr>
              </table>

              <h3 style="color: #1f2937; margin-top: 30px;">What's Next?</h3>
              <ul style="line-height: 2; color: #374151;">
                <li><strong>Test the Bug Hunter:</strong> Click the orange bug icon in your app</li>
                <li><strong>Trigger an error:</strong> Run <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px;">console.error("test")</code> in browser console</li>
                <li><strong>Submit a bug report:</strong> All reports will come from your verified domain!</li>
              </ul>

              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 30px 0; border-radius: 4px;">
                <p style="margin: 0; color: #1e40af;">
                  <strong>💡 Pro Tip:</strong> Bug reports will now come from <code>noreply@bugs.crucibleanalytics.dev</code>
                  instead of the generic Resend domain. This looks more professional and has better deliverability!
                </p>
              </div>

              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  This is a test email from K9CREST Bug Hunter
                </p>
                <p style="color: #6b7280; font-size: 14px; margin: 5px 0 0 0;">
                  Powered by <a href="https://resend.com" style="color: #3b82f6; text-decoration: none;">Resend</a>
                </p>
              </div>
            </div>

            <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
              <p>K9CREST - Professional Trial Management System</p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Error sending email:', error);
      process.exit(1);
    }

    console.log('✅ Test email sent successfully!\n');
    console.log('📋 Email Details:');
    console.log(`   Email ID: ${data.id}`);
    console.log(`   From: ${process.env.RESEND_FROM_EMAIL || 'noreply@bugs.crucibleanalytics.dev'}`);
    console.log(`   To: ${process.env.BUG_REPORT_EMAIL || 'joseph@crucibleanalytics.dev'}`);
    console.log('\n📬 Check your inbox at:', process.env.BUG_REPORT_EMAIL || 'joseph@crucibleanalytics.dev');
    console.log('\n🎉 Success! Your custom domain is working!\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Run the test
sendTestEmail();
