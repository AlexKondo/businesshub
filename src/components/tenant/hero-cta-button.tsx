"use client";

// Plain `<a href="#cadastro">` was silently doing nothing whenever the form
// section was already inside the viewport (short pages, large screens) —
// a supplier clicking it saw zero visible feedback and assumed the button
// was broken. Smooth-scrolling always animates something, and focusing the
// first field makes it unmistakable that the click did something even when
// there was no distance to scroll at all.
export function HeroCtaButton({ label }: { label: string }) {
  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const section = document.getElementById("cadastro");
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      document.getElementById("contactName")?.focus();
    }, 400);
  }

  return (
    <a
      href="#cadastro"
      onClick={handleClick}
      className="inline-flex h-11 items-center rounded-md bg-(--brand-500) px-6 text-sm font-semibold text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
    >
      {label}
    </a>
  );
}
