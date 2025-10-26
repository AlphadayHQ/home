export const navigateToHash = (timeoutId, isActive) => {
  const hash = window.location.hash.slice(1);
  if (!hash) return;

  if (timeoutId) clearTimeout(timeoutId);

  const tryScroll = (attempts = 0) => {
    if (!isActive) return;

    const element = document.getElementById(hash);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    } else if (attempts < 50) {
      timeoutId = setTimeout(() => tryScroll(attempts + 1), 100);
    }
  };

  // KEY CHANGE: Always delay on first mount
  // This ensures React hydration is complete in production
  setTimeout(() => {
    tryScroll();
  }, 0); // Pushes to next event loop cycle
};
