// Express request augmentation
import 'express';

declare global {
  namespace Express {
    interface Request {
      traceId: string;
    }
  }
}

export {};
