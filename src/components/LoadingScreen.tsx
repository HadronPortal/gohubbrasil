export const LoadingScreen = () => (
  <div className="gohub-client flex min-h-screen flex-col items-center justify-center bg-white px-8" role="status" aria-label="Carregando">
    <div className="relative flex w-72 max-w-[78vw] items-center justify-center bg-transparent">
      <img src="/logo-gohub-loading.png" alt="GoHub" className="block w-60 max-w-full animate-pulse object-contain" />
    </div>
    <div className="mt-5 flex gap-1.5" aria-hidden="true">
      <span className="gohub-loader-dot" />
      <span className="gohub-loader-dot [animation-delay:160ms]" />
      <span className="gohub-loader-dot [animation-delay:320ms]" />
    </div>
  </div>
);
