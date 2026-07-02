export async function parseJsonResponse<T = any>(response: Response, fallback: T): Promise<T> {
  const text = await response.text();
  if (!text) {
    return fallback;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}
