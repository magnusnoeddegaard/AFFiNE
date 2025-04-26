import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { setupOpenTelemetry } from './base/metrics/opentelemetry';
import { setupSwagger } from './base/swagger';

async function bootstrap() {
  // Setup OpenTelemetry before application starts
  await setupOpenTelemetry();

  const app = await NestFactory.create(AppModule);
  
  // Apply global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  
  // Enable CORS
  app.enableCors();
  
  // Set up Swagger documentation
  setupSwagger(app);
  
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation is available at: http://localhost:${port}/api-docs`);
}

bootstrap();