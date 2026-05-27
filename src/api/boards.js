const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD
    ? "https://api.alphaday.com/"
    : "https://api.zettaday.com/");

const APP_ID = import.meta.env.VITE_X_APP_ID;
const APP_SECRET = import.meta.env.VITE_X_APP_SECRET;

function authHeaders() {
  return {
    "x-app-id": APP_ID,
    "x-app-secret": APP_SECRET,
  };
}

function apiUrl(path) {
  return `${API_BASE_URL.replace(/\/$/, "")}${path}`;
}

export async function fetchLandingPageBySlug(slug) {
  const res = await fetch(
    apiUrl(`/ui/landing-pages/?slug=${encodeURIComponent(slug)}`),
    { headers: authHeaders() }
  );

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load landing page: ${res.status}`);

  return res.json();
}
