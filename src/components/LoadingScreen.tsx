export const LoadingScreen = () => (
  <div className="gohub-client flex min-h-screen flex-col items-center justify-center bg-white px-8" role="status" aria-label="Carregando">
    <div className="gohub-loader relative flex h-32 w-64 items-center justify-center overflow-hidden">
      <img src="/Logo-GoHub.png" alt="GoHub" className="w-[420px] max-w-none object-contain" />
      <span className="gohub-loader-shine" aria-hidden="true" />
    </div>
    <div className="mt-5 flex gap-1.5" aria-hidden="true">
      <span className="gohub-loader-dot" />
      <span className="gohub-loader-dot [animation-delay:160ms]" />
      <span className="gohub-loader-dot [animation-delay:320ms]" />
    </div>
  </div>
);
