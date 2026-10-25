import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // No FRONTEND_ORIGIN set → allow any origin (local dev). Once deployed, set
  // FRONTEND_ORIGIN (comma-separated for multiple) to lock this down for real.
  const frontendOrigin = config.get<string>('FRONTEND_ORIGIN');
  app.enableCors({
    origin: frontendOrigin ? frontendOrigin.split(',').map((o) => o.trim()) : true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Hugeworth Pharmacy Management System API')
    .setDescription(
      'Phase 1: Accounts & Roles, Inventory, Sales/POS, Activity Log',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Hugeworth PMS API running on port ${port} — docs at /docs`);
}
bootstrap();
