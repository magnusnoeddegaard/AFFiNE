import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
    
  const document = SwaggerModule.createDocument(app, config);
  
  // Ensure the directory exists
  const outputDir = path.join(process.cwd(), 'swagger');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }
  
  // Write the Swagger JSON to a file
  fs.writeFileSync(
    path.join(outputDir, 'swagger.json'),
    JSON.stringify(document, null, 2)
  );
  
  console.log('Swagger documentation generated at swagger/swagger.json');
  
  await app.close();
}

bootstrap();