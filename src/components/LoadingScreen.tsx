export const LoadingScreen = () => (
  <div
    className="gohub-client flex min-h-screen flex-col items-center justify-center px-8"
    style={{ background: "#fff" }}
    role="status"
    aria-label="Carregando"
  >
    <img
      src="/logo-gohub-loading.png"
      alt="GoHub"
      className="w-60 max-w-[70%] animate-pulse object-contain"
      style={{ border: 0, boxShadow: "none", background: "transparent" }}
    />
    <div className="mt-6 flex gap-1.5" aria-hidden="true">
      <span className="gohub-loader-dot" />
      <span className="gohub-loader-dot [animation-delay:160ms]" />
      <span className="gohub-loader-dot [animation-delay:320ms]" />
    </div>
  </div>
);
