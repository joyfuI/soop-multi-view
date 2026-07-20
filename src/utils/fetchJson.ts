const fetchJson = async <T>(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<T> => {
  const response = await fetch(input, init);
  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || response.statusText, { cause: response });
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new Error(response.statusText, { cause: response });
  }

  return json as T;
};

export default fetchJson;
