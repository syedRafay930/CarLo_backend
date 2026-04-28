import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
    app.enableCors({
     origin: [
    'http://127.0.0.1:60036',
    'http://localhost:3000',
    'http://localhost:59310'
  ], 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  app.useGlobalPipes(new ValidationPipe({transform: true,whitelist: true,forbidNonWhitelisted: true}));

   const config = new DocumentBuilder()
        .setTitle('Carlo API') // Customize your API title
        .setDescription('Your API description') // Customize your API description
        .setVersion('1.0') // Customize your API version
        .addBearerAuth() // Optional: if you use bearer token authentication
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api', app, document); // 'api' is the path where Swagger UI will be accessible


  await app.listen(3005);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
