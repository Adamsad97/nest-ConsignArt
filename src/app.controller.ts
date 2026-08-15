import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get basic API information' })
  getApiInfo() {
    return this.appService.getApiInfo();
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check (API and database connectivity)' })
  getHealth() {
    return this.appService.getHealth();
  }
}
