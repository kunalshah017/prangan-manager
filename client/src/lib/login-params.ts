export const readLoginPrefill = (
  searchParams: URLSearchParams,
): { email?: string } => {
  const email = searchParams.get("email")?.trim();

  return email ? { email } : {};
};
