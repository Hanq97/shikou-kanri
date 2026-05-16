import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { AppConfigService } from '../../config/app-config.service';
import { renderTemplate } from './templates/engine';

interface SendMailOptions {
  to: string;
  subject: string;
  template: string;
  vars: Record<string, unknown>;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter!: Transporter;

  constructor(private readonly config: AppConfigService) {}

  onModuleInit(): void {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST'),
      port: this.config.get('SMTP_PORT'),
      secure: false,
      auth: this.config.get('SMTP_USER')
        ? {
            user: this.config.get('SMTP_USER'),
            pass: this.config.get('SMTP_PASS') ?? '',
          }
        : undefined,
      // Mailhog has self-signed cert; in prod use real CA via env
      tls: { rejectUnauthorized: this.config.isProduction() },
    });
  }

  async send(opts: SendMailOptions): Promise<void> {
    const html = renderTemplate(opts.template, opts.vars);
    try {
      const result = await this.transporter.sendMail({
        from: this.config.get('SMTP_FROM'),
        to: opts.to,
        subject: opts.subject,
        html,
      });
      this.logger.log(
        `Email sent: ${opts.template} → ${opts.to} (id=${result.messageId})`,
      );
    } catch (err) {
      this.logger.error(
        `Email send failed: ${opts.template} → ${opts.to}`,
        err as Error,
      );
      // Phase 1: don't throw — email failure should not block primary operation
      // Phase 2: queue with retry via BullMQ
    }
  }
}
