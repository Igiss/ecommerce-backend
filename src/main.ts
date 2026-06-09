import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.enableCors();
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Ecommerce Backend API')
    .setDescription('NestJS + MongoDB ecommerce backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      docExpansion: 'list',
      persistAuthorization: true,
      defaultModelsExpandDepth: 1,
    },
  });

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);

  const baseUrl = `http://localhost:${port}`;
  console.log(`Server: ${baseUrl}`);
  console.log(`API: ${baseUrl}/api`);
  console.log(`Swagger: ${baseUrl}/api/docs`);
  console.log(`Uploads: ${baseUrl}/uploads`);
}

void bootstrap();
