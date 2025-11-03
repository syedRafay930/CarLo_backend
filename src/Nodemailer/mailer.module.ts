import { Module } from '@nestjs/common';
import { MailService } from './mailer.service';
import { MailerProvider } from './mailer.provider';

@Module({
  providers: [MailService, MailerProvider],
  exports: [MailService],
})
export class MailModule {}
