import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for Vue frontend
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const port = process.env.PORT || 3000;

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  await app.listen(port);
  console.log(`Backend server running on http://localhost:${port}`);
}
bootstrap();
