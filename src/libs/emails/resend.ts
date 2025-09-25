import { Resend } from 'resend';
import { appEnv } from '@/envs/app';

// ✅ Don't create Resend instance immediately
// const resend = new Resend(appEnv.RESEND_API_KEY);

const sendEmail = async (payload: { html: string; subject: string; to: string | string[] }) => {
  if (!appEnv.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not configured. Email sending is disabled.');
    throw new Error(
      'Email service is not configured. Please set RESEND_API_KEY environment variable.',
    );
  }

  // ✅ Create Resend instance only when needed
  const resend = new Resend(appEnv.RESEND_API_KEY);

  const from = 'jamarri@klyno.ai';
  console.log('Attempting to send email with Resend from:', from, 'to:', payload.to);

  try {
    const result = await resend.emails.send({
      from,
      ...payload,
    });
    console.log('Email sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
};

export { sendEmail };