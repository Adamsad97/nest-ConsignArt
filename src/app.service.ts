import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getApiInfo() {
    return {
      name: 'ConsignArt API',
      version: '1.0',
      docs: '/api/docs',
    };
  }
}
