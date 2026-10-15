// Single place that registers the offline service worker.
// Never registers in dev, Lovable preview, or iframes; supports ?sw=off kill switch.
function bloqueado(): boolean {
  if (!import.meta.env.PROD) return true;
  if (window.self !== window.top) return true;
  const h = window.location.hostname;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
  const sufixos = ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"];
  if (sufixos.some((s) => h === s || h.endsWith(`.${s}`))) return true;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

export async function registrarServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (bloqueado()) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => r.active?.scriptURL.endsWith("/sw.js") || r.installing?.scriptURL.endsWith("/sw.js") || r.waiting?.scriptURL.endsWith("/sw.js"))
        .map((r) => r.unregister()),
    );
    return;
  }
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    // ignore
  }
}
