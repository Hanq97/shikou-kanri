import { CommandFactory } from 'nest-commander';
import { CliModule } from './cli/cli.module';

async function bootstrap(): Promise<void> {
  await CommandFactory.run(CliModule, {
    logger: ['error', 'warn', 'log'],
  });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('CLI error:', err);
  process.exit(1);
});
