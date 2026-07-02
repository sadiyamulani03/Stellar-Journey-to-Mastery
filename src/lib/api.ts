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

export function getApiErrorMessage(payload: any, response: Response, fallback: string): string {
  const message = payload && typeof payload === 'object'
    ? (payload.error || payload.message)
    : null;

  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  if (response.status === 401) {
    return 'Invalid username or password.';
  }

  if (response.status === 400) {
    return 'Please complete the required fields.';
  }

  if (response.status === 409) {
    return 'That username is already taken.';
  }

  if (response.status >= 500) {
    return 'Our server is temporarily unavailable. Please try again.';
  }

  return fallback;
}
