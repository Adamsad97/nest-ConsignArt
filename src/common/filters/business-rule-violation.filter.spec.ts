import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { BusinessRuleViolationFilter } from './business-rule-violation.filter';
import { BusinessRuleViolationException } from '../exceptions/business-rule-violation.exception';

interface MockResponse {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
}

describe('BusinessRuleViolationFilter', () => {
  let filter: BusinessRuleViolationFilter;
  let response: MockResponse;

  const buildHost = (url = '/api/v1/sales'): ArgumentsHost =>
    ({
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({ url }),
      }),
    }) as unknown as ArgumentsHost;

  beforeEach(() => {
    response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    filter = new BusinessRuleViolationFilter();
  });

  it('returns a 422 with the rule code and message of the exception', () => {
    const exception = new BusinessRuleViolationException(
      'An artwork on loan cannot be sold',
      'ARTWORK_ON_LOAN',
    );

    filter.catch(exception, buildHost());

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        error: 'BusinessRuleViolation',
        rule: 'ARTWORK_ON_LOAN',
        message: 'An artwork on loan cannot be sold',
        path: '/api/v1/sales',
        timestamp: expect.any(String),
      }),
    );
  });

  it('includes the request path of the failing call', () => {
    const exception = new BusinessRuleViolationException(
      'Sale price cannot be below reserve price',
      'BELOW_RESERVE_PRICE',
    );

    filter.catch(exception, buildHost('/api/v1/sales/checkout'));

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        rule: 'BELOW_RESERVE_PRICE',
        path: '/api/v1/sales/checkout',
      }),
    );
  });
});
