export const LoadingScreen = () => (
  <div className="gohub-client flex min-h-screen flex-col items-center justify-center bg-white px-8" role="status" aria-label="Carregando">
    <img
      src="/logo-gohub-loading.png?v=20260625-5"
      alt="GoHub"
      style={{ background: "transparent", border: 0, boxShadow: "none", outline: "none", padding: 0, margin: 0 }}
      className="block h-auto w-[220px] max-w-[68vw] animate-pulse object-contain"
    />
    <div className="mt-5 flex gap-1.5" aria-hidden="true">
      <span className="gohub-loader-dot" />
      <span className="gohub-loader-dot [animation-delay:160ms]" />
      <span className="gohub-loader-dot [animation-delay:320ms]" />
    </div>
  </div>
);
