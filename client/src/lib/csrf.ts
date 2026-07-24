let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;

export const clearCsrfToken = (): void => {
  csrfToken = null;
  csrfRequest = null;
};

export const getCsrfToken = async (apiBaseUrl: string): Promise<string> => {
  if (csrfToken) return csrfToken;

  csrfRequest ??= fetch(`${apiBaseUrl}/auth/csrf`, {
    credentials: "include",
  })
    .then(async (response) => {
      if (!response.ok) throw new Error("Unable to establish a CSRF session");
      const body = (await response.json()) as { csrfToken?: string };
      if (!body.csrfToken) throw new Error("CSRF token was not returned");
      csrfToken = body.csrfToken;
      return csrfToken;
    })
    .finally(() => {
      csrfRequest = null;
    });

  return csrfRequest;
};
