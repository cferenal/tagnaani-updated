export function LogoLoading() {
  return (
    <div className="grid h-full min-h-64 place-items-center" role="status" aria-label="Loading Tagna-Ani">
      <img className="h-24 w-24 rounded-3xl shadow-md motion-safe:animate-pulse" src="/logo.png" alt="" width="96" height="96" />
    </div>
  );
}
