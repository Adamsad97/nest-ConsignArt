import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { Request, Response } from 'express';
import { BusinessRuleViolationException } from '../exceptions/business-rule-violation.exception';

@Catch(BusinessRuleViolationException)
export class BusinessRuleViolationFilter implements ExceptionFilter {
  catch(exception: BusinessRuleViolationException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    response.status(exception.getStatus()).json({
      statusCode: exception.getStatus(),
      error: 'BusinessRuleViolation',
      rule: exception.rule,
      message: (exception.getResponse() as Record<string, unknown>)['message'],
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
