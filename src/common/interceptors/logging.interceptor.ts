import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  HttpException,
  HttpStatus,
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
        const status =
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;
        const message = `[${method}] ${url} → ${status} (${duration}ms) user=${userId}`;

        if (status >= 500) {
          this.logger.error(
            message,
            error instanceof Error ? error.stack : String(error),
          );
        } else {
          this.logger.warn(message);
        }

        return throwError(() => error);
      }),
    );
  }
}
