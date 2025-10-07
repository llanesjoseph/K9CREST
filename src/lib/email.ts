/**
 * Email Service - Resend Integration
 *
 * TODO: Add Resend API key to environment variables:
 * RESEND_API_KEY=re_xxxx
 */

type RegistrationEmailData = {
  to: string;
  handlerName: string;
  dogName: string;
  eventName: string;
  eventId: string;
};

/**
 * Send registration confirmation email
 *
 * @param data - Registration email data
 * @returns Promise<{ success: boolean; messageId?: string; error?: string }>
 */
export async function sendRegistrationConfirmation(data: RegistrationEmailData): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    // Check if Resend API key is configured
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.warn('⚠️ Resend API key not configured - email not sent');
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    // TODO: Uncomment when Resend API key is provided
    /*
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'K9 CREST <noreply@yourdomain.com>',
        to: data.to,
        subject: `Registration Confirmed - ${data.eventName}`,
        html: `
          <h2>Registration Confirmed!</h2>
          <p>Dear ${data.handlerName},</p>
          <p>Your registration for <strong>${data.eventName}</strong> has been received.</p>

          <h3>Registration Details:</h3>
          <ul>
            <li><strong>Handler:</strong> ${data.handlerName}</li>
            <li><strong>K9:</strong> ${data.dogName}</li>
            <li><strong>Event:</strong> ${data.eventName}</li>
          </ul>

          <p>Your registration is currently pending review. You will receive another email once it has been approved.</p>

          <p>If you have any questions, please contact the event organizer.</p>

          <p>Thank you,<br/>K9 CREST Team</p>
        `,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to send email');
    }

    console.log('✅ Confirmation email sent:', result.id);

    return {
      success: true,
      messageId: result.id,
    };
    */

    // Temporary return until Resend is configured
    console.log('📧 Would send email to:', data.to);
    console.log('   Handler:', data.handlerName);
    console.log('   K9:', data.dogName);
    console.log('   Event:', data.eventName);

    return {
      success: true,
      messageId: 'mock-email-id',
    };

  } catch (error: any) {
    console.error('❌ Email sending failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send approval notification email
 */
export async function sendApprovalEmail(data: RegistrationEmailData): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.warn('⚠️ Resend API key not configured - email not sent');
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    // TODO: Implement approval email when Resend is configured

    console.log('📧 Would send approval email to:', data.to);

    return {
      success: true,
      messageId: 'mock-approval-email-id',
    };

  } catch (error: any) {
    console.error('❌ Approval email failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
