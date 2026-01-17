import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
} from '@nestjs/terminus';
import { APP_CONSTANTS } from '@omr/shared-types';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private configService: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  check(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }

  @Get('info')
  @ApiOperation({ summary: 'Get service information' })
  @ApiResponse({ status: 200, description: 'Service information' })
  getInfo() {
    return {
      name: APP_CONSTANTS.NAME,
      version: APP_CONSTANTS.VERSION,
      description: APP_CONSTANTS.DESCRIPTION,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('license')
  @ApiOperation({ summary: 'Check application license status' })
  @ApiResponse({ status: 200, description: 'License status' })
  getLicenseStatus() {
    const isEnabled = this.configService.get<string>('APP_ENABLED') !== 'false';
    
    if (!isEnabled) {
        throw new ServiceUnavailableException({
            status: 'suspended',
            message: 'Application license is suspended. Please contact administrator.',
        });
    }

    return {
      status: 'active',
      enabled: true,
      timestamp: new Date().toISOString(),
    };
  }
}
