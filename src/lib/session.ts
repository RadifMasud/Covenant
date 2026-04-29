const SESSION_KEY = "covenant_email";

export function getSessionEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}

export function setSessionEmail(email: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, email);
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}
