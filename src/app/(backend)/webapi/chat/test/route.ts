export const runtime = 'nodejs';

export const POST = async (_req: Request) => {
  return new Response('Node.js route test OK', { status: 200 });
};
