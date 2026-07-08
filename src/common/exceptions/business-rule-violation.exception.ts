import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessRuleViolationException extends HttpException {
  constructor(
    message: string,
    public readonly rule: string,
  ) {
    super(
      { message, rule, statusCode: HttpStatus.UNPROCESSABLE_ENTITY },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
