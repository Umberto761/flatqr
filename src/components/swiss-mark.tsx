export function SwissMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-flex size-4 items-center justify-center bg-[#da291c] ${className}`}
    >
      <span className="relative block size-3">
        <span className="absolute top-1/2 left-0 h-[2px] w-full -translate-y-1/2 bg-white" />
        <span className="absolute top-0 left-1/2 h-full w-[2px] -translate-x-1/2 bg-white" />
      </span>
    </span>
  );
}
