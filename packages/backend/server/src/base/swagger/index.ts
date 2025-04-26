import { Module } from '@nestjs/common';
import { SwaggerModule as NestSwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('AFFiNE API')
    .setDescription('AFFiNE backend API documentation')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('user', 'User management endpoints')
    .addTag('document', 'Document management endpoints')
    .addTag('workspace', 'Workspace management endpoints')
    .addTag('permission', 'Permission management endpoints')
    .addTag('storage', 'Storage and blob management endpoints')
    .addBearerAuth()
    .build();
  
  const document = NestSwaggerModule.createDocument(app, config);
  NestSwaggerModule.setup('api-docs', app, document);
}

@Module({})
export class SwaggerModule {}