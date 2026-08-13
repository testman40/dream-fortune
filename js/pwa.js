export function setupPwa(installButton, announce) {
  let deferredPrompt = null;
  if ("serviceWorker" in navigator) {
    const registerServiceWorker = () => {
      navigator.serviceWorker.register("./sw.js").catch(() => announce("オフライン機能を開始できませんでした。"));
    };
    if (document.readyState === "complete") registerServiceWorker();
    else window.addEventListener("load", registerServiceWorker, { once: true });
  }
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    installButton.hidden = false;
  });
  installButton.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installButton.hidden = true;
  });
  window.addEventListener("appinstalled", () => { installButton.hidden = true; announce("アプリをホーム画面に追加しました。"); });
}
