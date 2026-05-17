import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import puppeteer, { type Browser } from 'puppeteer';

// dayjs + handlebars are CJS-style; backend tsconfig doesn't enable esModuleInterop
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dayjs = require('dayjs') as (date?: string | Date) => {
  format: (template: string) => string;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Handlebars = require('handlebars') as {
  compile: (source: string) => HandlebarsTemplateDelegate;
  registerHelper: (name: string, fn: (...args: unknown[]) => unknown) => void;
};
import { AuthInsufficientPermissionError } from '../../../shared/exceptions/auth-errors';
import {
  PdfGenerationFailedError,
  QuoteNotFoundError,
} from '../../../shared/exceptions/quote-errors';
import { AuthenticatedUser, RequestContext } from '../../auth/domain/types';
import { AuditStubService } from '../../auth/internal/audit-stub.service';
import { QuoteRepository } from '../repositories/quote.repository';
import { formatJpy } from '../utils/jpy-format';

const READ_ROLES = new Set(['system_admin', 'manager', 'employee']);

@Injectable()
export class QuotePdfService {
  private readonly logger = new Logger(QuotePdfService.name);
  private template: HandlebarsTemplateDelegate | null = null;

  constructor(
    private readonly quoteRepo: QuoteRepository,
    private readonly audit: AuditStubService,
  ) {}

  private getTemplate(): HandlebarsTemplateDelegate {
    if (!this.template) {
      const templatePath = path.join(
        __dirname,
        '..',
        'templates',
        'quote-pdf.hbs',
      );
      const source = fs.readFileSync(templatePath, 'utf8');
      this.template = Handlebars.compile(source);

      Handlebars.registerHelper('jpy', (n: unknown) =>
        formatJpy(n as number | string | null),
      );
      Handlebars.registerHelper('date', (d: Date) =>
        dayjs(d).format('YYYY年MM月DD日'),
      );
      Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
      Handlebars.registerHelper('addOne', (i: number) => i + 1);
    }
    return this.template;
  }

  async generate(
    quoteId: string,
    requester: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<{ buffer: Buffer; filename: string }> {
    if (!READ_ROLES.has(requester.role))
      throw new AuthInsufficientPermissionError();

    const quote = await this.quoteRepo.findByIdWithLines(quoteId);
    if (!quote) throw new QuoteNotFoundError(quoteId);

    const requiredLines = quote.lines.filter((l) => !l.isOptional);
    const optionalLines = quote.lines.filter((l) => l.isOptional);
    const optionalSubtotal = optionalLines.reduce(
      (sum, l) => sum + Number(l.amount),
      0,
    );

    const html = this.getTemplate()({
      quote: {
        ...quote,
        issuedAtFormatted: dayjs(quote.issuedAt).format('YYYY年MM月DD日'),
      },
      requiredLines: requiredLines.map((l) => ({
        ...l,
        quantity: l.quantity.toString(),
        unitPrice: l.unitPrice.toString(),
        amount: l.amount.toString(),
      })),
      optionalLines: optionalLines.map((l) => ({
        ...l,
        quantity: l.quantity.toString(),
        unitPrice: l.unitPrice.toString(),
        amount: l.amount.toString(),
      })),
      optionalSubtotal,
      isDraft: quote.status === 'draft',
      generatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    });

    let browser: Browser | null = null;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const buffer = Buffer.from(
        await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
        }),
      );

      // Audit best-effort (no transaction)
      await this.audit.logQuotePdfDownloaded(quoteId, requester.id, ctx);

      const filename = `${quote.quoteNumber}-v${quote.versionNo}.pdf`;
      return { buffer, filename };
    } catch (err) {
      this.logger.error(
        `PDF generation failed for quote ${quoteId}: ${(err as Error).message}`,
      );
      throw new PdfGenerationFailedError((err as Error).message);
    } finally {
      if (browser) await browser.close();
    }
  }
}
