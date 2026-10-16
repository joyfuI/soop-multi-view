import { normalizeId } from '../../src/helper/ids.ts';

const qualities = new Set([
  'sd',
  'hd',
  'hd2k',
  'hd4k',
  'hd8k',
  'original',
  'master',
  'auto',
]);
const respond = (data, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const fail = (status, error) =>
  respond({ CHANNEL: { RESULT: 0 }, error }, status);

export default async (request) => {
  if (request.method !== 'POST') return fail(405, 'method-not-allowed');
  if (Number(request.headers.get('content-length')) > 1024)
    return fail(413, 'request-too-large');

  let data;
  try {
    const body = await request.text();
    if (body.length > 1024) return fail(413, 'request-too-large');
    data = JSON.parse(body);
  } catch {
    return fail(400, 'invalid-json');
  }
  const bid = normalizeId(data?.bid);
  if (
    !bid ||
    typeof data?.bno !== 'string' ||
    !/^[1-9]\d{0,19}$/.test(data.bno) ||
    !qualities.has(data?.quality)
  )
    return fail(400, 'invalid-parameters');

  try {
    // 익명 AID만 발급하며 브라우저의 쿠키와 전달 헤더를 SOOP에 보내지 않는다.
    const upstream = await fetch(
      'https://live.sooplive.com/afreeca/player_live_api.php',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Origin: 'https://play.sooplive.com',
          Referer: `https://play.sooplive.com/${bid}/${data.bno}`,
        },
        body: new URLSearchParams({
          bid,
          bno: data.bno,
          quality: data.quality,
          type: 'aid',
          pwd: '',
          player_type: 'html5',
          stream_type: 'common',
          mode: 'landing',
          from_api: '0',
        }),
        redirect: 'error',
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!upstream.ok) return fail(502, 'upstream-error');
    const result = await upstream.json();
    if (
      typeof result?.CHANNEL?.RESULT !== 'number' ||
      (result.CHANNEL.RESULT === 1 &&
        (typeof result.CHANNEL.AID !== 'string' || !result.CHANNEL.AID))
    )
      return fail(502, 'invalid-upstream-response');
    return respond(result);
  } catch (error) {
    return fail(
      error.name === 'TimeoutError' ? 504 : 502,
      'upstream-unavailable',
    );
  }
};

export const config = {
  path: '/api/soop-aid',
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
