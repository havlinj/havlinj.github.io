const E2E_HEALTH_TOKEN = 'documents-web:e2e-health:v1';

export function GET() {
  return new Response(E2E_HEALTH_TOKEN, {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
