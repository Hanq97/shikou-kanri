import { SetMetadata } from '@nestjs/common';

export const REQUIRE_2FA_KEY = 'require2fa';

export const Require2FA = (): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRE_2FA_KEY, true);
