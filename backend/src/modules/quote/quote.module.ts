import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { CustomerModule } from '../customer/customer.module';
import { QuotesController } from './controllers/quotes.controller';
import { UnitPricesController } from './controllers/unit-prices.controller';
import { QuoteCalculator } from './internal/quote-calculator';
import { QuoteLineRepository } from './repositories/quote-line.repository';
import { QuoteVersionRepository } from './repositories/quote-version.repository';
import { QuoteRepository } from './repositories/quote.repository';
import { UnitPriceRepository } from './repositories/unit-price.repository';
import { QuoteNumberGeneratorService } from './services/quote-number-generator.service';
import { QuotePdfService } from './services/quote-pdf.service';
import { QuoteStatusMachineService } from './services/quote-status-machine.service';
import { QuoteVersioningService } from './services/quote-versioning.service';
import { QuotesService } from './services/quotes.service';
import { UnitPricesService } from './services/unit-prices.service';

@Module({
  imports: [AuthModule, CustomerModule],
  controllers: [QuotesController, UnitPricesController],
  providers: [
    QuotesService,
    QuoteStatusMachineService,
    QuoteVersioningService,
    QuotePdfService,
    QuoteNumberGeneratorService,
    UnitPricesService,
    QuoteCalculator,
    QuoteRepository,
    QuoteLineRepository,
    QuoteVersionRepository,
    UnitPriceRepository,
  ],
  exports: [QuotesService, QuoteRepository],
})
export class QuoteModule {}
