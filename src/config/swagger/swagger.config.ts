import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

const API_DESCRIPTION = `
  API Documentation for Control Tower API, a transversal API that provides support
  to mulutiple Airpharm SLU applications and systems.\n
  We've defined the basic blocks for warehouse overview, inbound and outbound orders,
  and pseudo-static master data like customers, owners, and addresses.
`;

export function setupSwagger(app: INestApplication): void {
  const options = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription(API_DESCRIPTION)
    .setVersion('1.0')
    .addTag('Control')
    .addTag('Products')
    .addTag('Shopping List Products')
    .addTag('Stock Products')
    .addTag('Tasks')
    .addTag('Tags')
    .addTag('Shops')
    .addTag('Shifts')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api-docs', app, document);
}
