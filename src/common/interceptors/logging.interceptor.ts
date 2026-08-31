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
import { appendFile, mkdir } from 'fs/promises';
import { join } from 'path';

export const LOG_DIR = join(process.cwd(), 'logs');
export const LOG_FILE = join(LOG_DIR, 'http.log');

interface HttpLogEntry {
  timestamp: string;
  method: string;
  url: string;
  status: number;
  durationMs: number;
  userId: string;
  error?: string;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private readonly logDirReady = mkdir(LOG_DIR, { recursive: true }).catch(
    () => undefined,
  );

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;
    const userId = request.user?.id ?? 'anonymous';
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const status = context
          .switchToHttp()
          .getResponse<Response>().statusCode;
        this.record({
          method,
          url,
          status,
          durationMs: Date.now() - start,
          userId,
        });
      }),
      catchError((error: unknown) => {
        const status =
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;
        this.record({
          method,
          url,
          status,
          durationMs: Date.now() - start,
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
        return throwError(() => error);
      }),
    );
  }

  /**
   * Logs every request to the console (for `docker compose logs`) and
   * appends a structured line to logs/http.log. The file write is
   * fire-and-forget so a slow or read-only filesystem never delays the
   * response — a failure is reported once to the console logger instead.
   */
  private record(entry: Omit<HttpLogEntry, 'timestamp'>): void {
    const summary = `[${entry.method}] ${entry.url} → ${entry.status} (${entry.durationMs}ms) user=${entry.userId}`;

    if (entry.status >= 500) {
      this.logger.error(summary, entry.error);
    } else if (entry.status >= 400) {
      this.logger.warn(summary);
    } else {
      this.logger.log(summary);
    }

    const logEntry: HttpLogEntry = {
      timestamp: new Date().toISOString(),
      ...entry,
    };

    void this.logDirReady
      .then(() => appendFile(LOG_FILE, JSON.stringify(logEntry) + '\n'))
      .catch((fsError: unknown) => {
        this.logger.error(
          `Failed to write HTTP log to ${LOG_FILE}: ${String(fsError)}`,
        );
      });
  }
}
