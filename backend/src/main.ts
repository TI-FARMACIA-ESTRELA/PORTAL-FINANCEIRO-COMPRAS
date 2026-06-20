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
  // FRONTEND_URL aceita várias origens separadas por vírgula.
  // Em desenvolvimento, libera também acessos pela rede local (IP:5173).
  const isDev = (process.env.NODE_ENV ?? 'development') !== 'production';
  const frontendUrls = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);
  const lanFrontendPattern =
    /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}):5173$/;

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      const allowed =
        frontendUrls.includes(origin) || (isDev && lanFrontendPattern.test(origin));
      callback(null, allowed);
    },
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
  await app.listen(port, '0.0.0.0');

  Logger.log(`API rodando em http://localhost:${port}/api`, 'Bootstrap');
  Logger.log(`API na rede: http://0.0.0.0:${port}/api`, 'Bootstrap');
}

void bootstrap();
