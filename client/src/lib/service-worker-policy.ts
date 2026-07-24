export type ServiceWorkerRequestInput = {
  method: string;
  url: string;
  origin: string;
  destination: string;
  mode: string;
  hasAuthorization: boolean;
};

export const shouldHandleServiceWorkerRequest = ({
  method,
  url,
  origin,
  hasAuthorization,
}: ServiceWorkerRequestInput): boolean => {
  if (method !== "GET" || hasAuthorization) return false;

  const requestUrl = new URL(url, origin);
  return (
    requestUrl.origin === origin &&
    requestUrl.pathname !== "/api" &&
    !requestUrl.pathname.startsWith("/api/") &&
    requestUrl.pathname !== "/@vite/client" &&
    !requestUrl.pathname.startsWith("/src/") &&
    !requestUrl.pathname.startsWith("/node_modules/.vite/") &&
    !requestUrl.pathname.endsWith(".pdf")
  );
};
