import { importJWK, jwtVerify } from 'jose';

import { JWTPayload, JWT_SECRET_KEY, NON_HTTP_PREFIX } from '@/const/auth';
import { base64Decode, base64EncodeFromBytes } from '@/utils/base64';

export const getJWTPayload = async (token: string): Promise<JWTPayload> => {
  //如果是 HTTP 协议发起的请求，直接解析 token
  // 这是一个非常 hack 的解决方案，未来要找更好的解决方案来处理这个问题
  // refs: https://github.com/lobehub/lobe-chat/pull/1238
  if (token.startsWith(NON_HTTP_PREFIX)) {
    const jwtParts = token.split('.');

    const payload = jwtParts[1];

    // Use universal base64 decoder for Edge Runtime compatibility
    return JSON.parse(base64Decode(payload));
  }

  const encoder = new TextEncoder();
  const secretKey = await crypto.subtle.digest('SHA-256', encoder.encode(JWT_SECRET_KEY));

  const jwkSecretKey = await importJWK(
    { k: base64EncodeFromBytes(new Uint8Array(secretKey)), kty: 'oct' },
    'HS256',
  );

  const { payload } = await jwtVerify(token, jwkSecretKey);

  return payload as JWTPayload;
};
