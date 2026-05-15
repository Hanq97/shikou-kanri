import { Global, Module } from '@nestjs/common';
import { AesService } from './aes.service';
import { Argon2Service } from './argon2.service';
import { HashService } from './hash.service';
import { RandomService } from './random.service';

@Global()
@Module({
  providers: [Argon2Service, AesService, HashService, RandomService],
  exports: [Argon2Service, AesService, HashService, RandomService],
})
export class CryptoModule {}
