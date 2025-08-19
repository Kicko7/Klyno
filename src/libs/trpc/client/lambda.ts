import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import superjson from 'superjson';

import { isDesktop } from '@/const/version';
import { ModelProvider } from '@/libs/model-runtime';
import type { LambdaRouter } from '@/server/routers/lambda';

import { ErrorResponse } from './types';


function getBaseUrl() {
  if (typeof window !== 'undefined') {
    return ''; // relative for browser
  }
  return process.env.LAMBDA_API_URL ?? 'http://localhost:3000';
}

const links = [
  httpBatchLink({
    fetch: async (input, init) => {
      if (isDesktop) {
        const { desktopRemoteRPCFetch } = await import('./helpers/desktopRemoteRPCFetch');
        const res = await desktopRemoteRPCFetch(input as string, init);
        if (res) return res;
      }

      const response = await fetch(input, init);

      if (response.ok) return response;

      const errorRes: ErrorResponse = await response.clone().json();

      const { loginRequired } = await import('@/components/Error/loginRequiredNotification');
      const { fetchErrorNotification } = await import('@/components/Error/fetchErrorNotification');

      errorRes.forEach((item) => {
        const errorData = item.error.json;
        const status = errorData.data.httpStatus;

        switch (status) {
          case 401: {
            loginRequired.redirect();
            break;
          }
          default: {
            fetchErrorNotification.error({ errorMessage: errorData.message, status });
          }
        }
      });

      return response;
    },
    headers: async () => {
      const { createHeaderWithAuth } = await import('@/services/_auth');
      return createHeaderWithAuth({ provider: ModelProvider.OpenAI });
    },
    maxURLLength: 2083,
    transformer: superjson,
    url: `/trpc/lambda`, 
  }),
];

export const lambdaClient = createTRPCClient<LambdaRouter>({ links });
export const lambdaQuery = createTRPCReact<LambdaRouter>();
export const lambdaQueryClient = lambdaQuery.createClient({ links });
