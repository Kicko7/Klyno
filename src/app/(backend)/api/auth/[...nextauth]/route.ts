// NextAuth disabled - only Clerk is supported
// Returning 404 for all NextAuth routes
export async function GET() {
  return new Response('NextAuth is disabled. Only Clerk authentication is supported.', {
    status: 404,
  });
}

export async function POST() {
  return new Response('NextAuth is disabled. Only Clerk authentication is supported.', {
    status: 404,
  });
}
