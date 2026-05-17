import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { CustomerImportController } from './controllers/customer-import.controller';
import { CustomersController } from './controllers/customers.controller';
import { PropertiesController } from './controllers/properties.controller';
import { CustomerRepository } from './repositories/customer.repository';
import { PropertyRepository } from './repositories/property.repository';
import { CustomerDuplicateCheckService } from './services/customer-duplicate-check.service';
import { CustomerImportService } from './services/customer-import.service';
import { CustomersService } from './services/customers.service';
import { PropertiesService } from './services/properties.service';

@Module({
  imports: [AuthModule],
  controllers: [
    CustomersController,
    PropertiesController,
    CustomerImportController,
  ],
  providers: [
    CustomersService,
    CustomerDuplicateCheckService,
    CustomerImportService,
    PropertiesService,
    CustomerRepository,
    PropertyRepository,
  ],
  exports: [
    CustomersService,
    CustomerImportService,
    PropertiesService,
    CustomerRepository,
    PropertyRepository,
  ],
})
export class CustomerModule {}
