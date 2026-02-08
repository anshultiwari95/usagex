/**
 * UsageX logo: icon + wordmark. Click scrolls to top.
 */
export function Logo() {
  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <h1>
      <button
        type="button"
        onClick={scrollTop}
        className="group flex cursor-pointer items-center gap-2.5 rounded-lg p-1 transition-all duration-200 hover:scale-[1.02] hover:opacity-90 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-usagex-primary/30 focus:ring-offset-2 -m-1"
        aria-label="UsageX – go to top"
      >
      {/* Icon: lightning bolt (usage / speed) */}
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-usagex-primary shadow-md transition-transform duration-200 group-hover:scale-105">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 text-white"
          aria-hidden
        >
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      </span>
      {/* Wordmark */}
      <span className="text-xl font-bold tracking-tight text-usagex-dark">
        <span className="text-slate-700">Usage</span>
        <span className="text-usagex-primary">X</span>
      </span>
    </button>
    </h1>
  );
}
