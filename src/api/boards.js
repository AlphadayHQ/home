const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD
    ? "https://api.alphaday.com/"
    : "https://api.zettaday.com/");

const APP_ID = import.meta.env.VITE_X_APP_ID;
const APP_SECRET = import.meta.env.VITE_X_APP_SECRET;

export async function fetchBoardBySlug(slug) {
  const url = `${API_BASE_URL.replace(/\/$/, "")}/ui/views/resolve/?slug=${encodeURIComponent(slug)}`;
  const res = await fetch(url, {
    headers: {
      "x-app-id": APP_ID,
      "x-app-secret": APP_SECRET,
    },
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load board: ${res.status}`);

  return res.json();
}
