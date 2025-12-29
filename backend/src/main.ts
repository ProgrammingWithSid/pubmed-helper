import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for Vue frontend
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const port = process.env.PORT || 3000;

  // Handle multiple origins (for production with www and non-www)
  const allowedOrigins = frontendUrl.includes(',')
    ? frontendUrl.split(',').map(url => url.trim())
    : [frontendUrl];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  await app.listen(port);
  console.log(`Backend server running on http://localhost:${port}`);
}
bootstrap();
