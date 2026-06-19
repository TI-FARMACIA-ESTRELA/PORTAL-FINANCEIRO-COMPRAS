import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.use(cookieParser());

  // CORS com credenciais (necessário para o cookie httpOnly de refresh token).
  // origin = URL exata do frontend (Coolify cross-domain controlado por env).
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(process.env.BACKEND_PORT ?? 3000);
  await app.listen(port);

  Logger.log(`API rodando em http://localhost:${port}/api`, 'Bootstrap');
}

void bootstrap();
