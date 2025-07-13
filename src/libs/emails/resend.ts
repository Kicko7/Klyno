import { Resend } from 'resend';

import { appEnv } from '@/envs/app';

const resend = new Resend(appEnv.RESEND_API_KEY);

const sendEmail = async (payload: {
  react: string;
  subject: string;
  to: string | string[];
}) => {
  if (!appEnv.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not configured. Email sending is disabled.');
    return;
  }
  const from = 'jamarri@klyno.ai';
  console.log('Attempting to send email with Resend from:', from, payload);
  return resend.emails.send({
    from,
    ...payload,
  });
};

export { sendEmail };
