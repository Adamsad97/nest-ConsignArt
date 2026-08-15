import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  getApiInfo() {
    return {
      name: 'ConsignArt API',
      version: '1.0',
      docs: '/api/docs',
    };
  }

  /**
   * Used by the Docker healthcheck: returns 200 only when the API can
   * actually reach the database, so an api container with a dead DB
   * connection is reported unhealthy instead of just "process running".
   */
  async getHealth() {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('Database unreachable');
    }

    return {
      status: 'ok',
      database: 'up',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
