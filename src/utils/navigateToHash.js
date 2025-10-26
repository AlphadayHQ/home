export const navigateToHash = (timeoutId, isActive) => {
  const hash = window.location.hash.slice(1);
  if (!hash) return;

  // Clear any existing timeout
  if (timeoutId) clearTimeout(timeoutId);

  const tryScroll = (attempts = 0) => {
    if (!isActive) return; // Component unmounted

    const element = document.getElementById(hash);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    } else if (attempts < 50) {
      timeoutId = setTimeout(() => tryScroll(attempts + 1), 100);
    }
  };

  if (document.readyState === "complete") {
    tryScroll();
  } else {
    window.addEventListener("load", () => tryScroll(), { once: true });
  }
};
