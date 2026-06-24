export const LoadingScreen = () => (
  <div className="gohub-client flex min-h-screen flex-col items-center justify-center bg-white px-8" role="status" aria-label="Carregando">
    <div className="gohub-loader relative flex h-28 w-72 items-center justify-center">
      <img src="/logo-gohub-loading.png" alt="GoHub" className="w-60 max-w-full animate-pulse object-contain" />
      <span className="gohub-loader-shine" aria-hidden="true" />
    </div>
    <div className="mt-5 flex gap-1.5" aria-hidden="true">
      <span className="gohub-loader-dot" />
      <span className="gohub-loader-dot [animation-delay:160ms]" />
      <span className="gohub-loader-dot [animation-delay:320ms]" />
    </div>
  </div>
);
