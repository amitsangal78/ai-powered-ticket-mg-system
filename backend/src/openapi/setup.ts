import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Express, RequestHandler } from 'express';
import swaggerUi from 'swagger-ui-express';
import { parse as parseYaml } from 'yaml';

const OPENAPI_RELATIVE = '../../openapi/openapi.yaml';

export function resolveOpenApiPath(): string {
  return path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    OPENAPI_RELATIVE,
  );
}

export function loadOpenApiDocument(): Record<string, unknown> {
  const filePath = resolveOpenApiPath();
  const raw = fs.readFileSync(filePath, 'utf8');
  const doc = parseYaml(raw) as unknown;
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new Error(`Invalid OpenAPI document at ${filePath}`);
  }
  return doc as Record<string, unknown>;
}

/**
 * Mounts:
 * - GET /api/openapi.yaml — raw OpenAPI 3 YAML (committed artifact)
 * - GET /api/docs — Swagger UI
 */
export function mountOpenApiDocs(app: Express): void {
  const openApiPath = resolveOpenApiPath();
  const document = loadOpenApiDocument();

  const serveYaml: RequestHandler = (_req, res): void => {
    res.type('application/yaml').send(fs.readFileSync(openApiPath, 'utf8'));
  };

  app.get('/api/openapi.yaml', serveYaml);
  app.get('/api/openapi.json', (_req, res): void => {
    res.json(document);
  });

  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(document, {
      customSiteTitle: 'Ticket MG API Docs',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
      },
    }),
  );
}
