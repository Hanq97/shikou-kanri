import { Injectable } from '@nestjs/common';
import { AppEnv, loadEnv } from './env.schema';

@Injectable()
export class AppConfigService {
  private readonly env: AppEnv;

  constructor() {
    this.env = loadEnv();
  }

  get<K extends keyof AppEnv>(key: K): AppEnv[K] {
    return this.env[key];
  }

  isProduction(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  isDevelopment(): boolean {
    return this.env.NODE_ENV === 'development';
  }

  isTest(): boolean {
    return this.env.NODE_ENV === 'test';
  }
}
