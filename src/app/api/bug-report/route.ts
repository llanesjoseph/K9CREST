import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Lazy initialization to avoid build-time errors when env var is not available
let resend: Resend | null = null;

function getResendClient() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

interface BugReportData {
  title: string;
  description: string;
  errors: Array<{
    message: string;
    stack?: string;
    timestamp: string;
    type: string;
  }>;
  userAgent: string;
  url: string;
  userEmail: string;
  userRole?: string;
  viewAsRole?: string;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  try {
    const data: BugReportData = await request.json();

    // Validate required fields
    if (!data.title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    // Format console errors for email
    const errorsHtml = data.errors.length > 0
      ? `
        <h3 style="color: #dc2626; margin-top: 20px;">Console Errors (${data.errors.length})</h3>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 12px;">
          ${data.errors.map((error) => `
            <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #d1d5db;">
              <div style="color: ${error.type === 'error' ? '#dc2626' : '#f59e0b'}; font-weight: bold;">
                [${error.type.toUpperCase()}] ${new Date(error.timestamp).toLocaleString()}
              </div>
              <div style="color: #374151; margin-top: 5px;">${error.message}</div>
              ${error.stack ? `<pre style="color: #6b7280; margin-top: 5px; overflow-x: auto;">${error.stack}</pre>` : ''}
            </div>
          `).join('')}
        </div>
      `
      : '<p style="color: #6b7280;">No console errors captured</p>';

    // Create email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Bug Report - ${data.title}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #dc2626; color: white; padding: 20px; border-radius: 5px 5px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🐛 Bug Report</h1>
          </div>

          <div style="background-color: #fff; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 5px 5px;">
            <h2 style="color: #1f2937; margin-top: 0;">${data.title}</h2>

            <div style="background-color: #f9fafb; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1f2937;">Description</h3>
              <p style="white-space: pre-wrap; color: #374151;">${data.description || 'No description provided'}</p>
            </div>

            ${errorsHtml}

            <h3 style="color: #1f2937; margin-top: 30px;">System Information</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <tr style="background-color: #f3f4f6;">
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold; width: 150px;">User Email</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${data.userEmail}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">User Role</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb; text-transform: capitalize;">
                  ${data.userRole || 'Unknown'}
                  ${data.viewAsRole ? `<span style="color: #ea580c;"> (viewing as ${data.viewAsRole})</span>` : ''}
                </td>
              </tr>
              <tr style="background-color: #f3f4f6;">
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">URL</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${data.url}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Timestamp</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${new Date(data.timestamp).toLocaleString()}</td>
              </tr>
              <tr style="background-color: #f3f4f6;">
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">User Agent</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb; font-size: 11px; word-break: break-all;">${data.userAgent}</td>
              </tr>
            </table>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
              <p>This bug report was automatically generated by the SCORE Bug Hunter feature.</p>
              <p>Reported at: ${new Date(data.timestamp).toLocaleString()}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email via Resend
    const resendClient = getResendClient();
    if (!resendClient) {
      console.error('Resend client not initialized - RESEND_API_KEY may be missing');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    const { data: emailData, error: emailError } = await resendClient.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'SCORE Bug Hunter <bugs@score.com>',
      to: process.env.BUG_REPORT_EMAIL || 'joseph@crucibleanalytics.dev',
      subject: `🐛 Bug Report: ${data.title}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error('Error sending bug report email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send bug report email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Bug report sent successfully',
      emailId: emailData?.id,
    });

  } catch (error: any) {
    console.error('Error processing bug report:', error);
    return NextResponse.json(
      { error: 'Failed to process bug report', details: error.message },
      { status: 500 }
    );
  }
}
