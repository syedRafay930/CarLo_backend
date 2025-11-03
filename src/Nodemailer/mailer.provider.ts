import * as nodemailer from 'nodemailer';
import { Provider } from '@nestjs/common';

export const MailerProvider: Provider = {
  provide: 'MAILER_TRANSPORTER',
  useFactory: async () => {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER, 
        pass: process.env.MAIL_PASS, 
      },
    });
  },
};
