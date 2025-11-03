import { Inject, Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class MailService {
  constructor(
    @Inject('MAILER_TRANSPORTER')
    private readonly transporter: nodemailer.Transporter,
  ) {}

  // Load template from file
  private loadTemplate(templateName: string): string {
    const isProd = process.env.NODE_ENV === 'production';
    const templatePath = isProd
      ? join(__dirname, 'templates', `${templateName}.template.html`)
      : join(
          process.cwd(),
          'src',
          'Nodemailer',
          'templates',
          `${templateName}.template.html`,
        );
    return readFileSync(templatePath, 'utf8');
  }

  private injectTemplateVariables(
    template: string,
    data: Record<string, string>,
  ): string {
    let content = template;
    for (const key in data) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      content = content.replace(regex, data[key]);
    }
    return content;
  }

  // Main method to send templated email
  async sendTemplatedMail(
    to: string,
    subject: string,
    templateName: string,
    data: Record<string, string>,
  ) {
    const template = this.loadTemplate(templateName);
    const html = this.injectTemplateVariables(template, data);

    const mailOptions = {
      from: process.env.MAIL_USER,
      to,
      subject,
      html,
    };

    return await this.transporter.sendMail(mailOptions);
  }
}
