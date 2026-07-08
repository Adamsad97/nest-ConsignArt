import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;
    const userId = request.user?.id ?? 'anonymous';
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        const status = context
          .switchToHttp()
          .getResponse<Response>().statusCode;
        this.logger.log(
          `[${method}] ${url} → ${status} (${duration}ms) user=${userId}`,
        );
      }),
      catchError((error: unknown) => {
        const duration = Date.now() - start;
        this.logger.error(
          `[${method}] ${url} → ERROR (${duration}ms) user=${userId}`,
          error instanceof Error ? error.stack : String(error),
        );
        return throwError(() => error);
      }),
    );
  }
}
