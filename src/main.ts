import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({transform: true,whitelist: true,forbidNonWhitelisted: true}));

   const config = new DocumentBuilder()
        .setTitle('Your API Title') // Customize your API title
        .setDescription('Your API description') // Customize your API description
        .setVersion('1.0') // Customize your API version
        .addBearerAuth() // Optional: if you use bearer token authentication
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api', app, document); // 'api' is the path where Swagger UI will be accessible


  const port = Number(process.env.PORT) || 3005;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
