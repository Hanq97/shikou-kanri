import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { CustomersController } from './controllers/customers.controller';
import { CustomerRepository } from './repositories/customer.repository';
import { CustomerDuplicateCheckService } from './services/customer-duplicate-check.service';
import { CustomersService } from './services/customers.service';

@Module({
  imports: [AuthModule],
  controllers: [CustomersController],
  providers: [
    CustomersService,
    CustomerDuplicateCheckService,
    CustomerRepository,
  ],
  exports: [CustomersService, CustomerRepository],
})
export class CustomerModule {}
