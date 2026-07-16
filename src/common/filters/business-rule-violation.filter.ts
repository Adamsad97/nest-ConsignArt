import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { Request, Response } from 'express';
import { BusinessRuleViolationException } from '../exceptions/business-rule-violation.exception';

@Catch(BusinessRuleViolationException)
export class BusinessRuleViolationFilter implements ExceptionFilter {
  catch(exception: BusinessRuleViolationException, host: ArgumentsHost): void {
    const httpContext = host.switchToHttp();
    const response = httpContext.getResponse<Response>();
    const request = httpContext.getRequest<Request>();

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
