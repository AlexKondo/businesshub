import { Link } from "@/i18n/navigation";

export function Wordmark() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 text-[15px] font-bold tracking-tight text-(--ink)"
    >
      <span className="h-2 w-2 rounded-[2px] bg-(--brand-500)" />
      BusinessHub
    </Link>
  );
}
