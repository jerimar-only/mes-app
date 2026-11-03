"use client";

/**
 * "Full view" must keep the same filters as the summary page.
 * Reads the live filter form (so unapplied dropdown changes still carry over),
 * and falls back to the server-built href from the current URL.
 */
export default function FullViewLink({
  href,
  className,
}: {
  href: string;
  className?: string;
}) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    const form = document.querySelector<HTMLFormElement>("form[data-records-filters]");
    if (!form) return; // use href as-is

    e.preventDefault();
    const fd = new FormData(form);
    const qs = new URLSearchParams();
    for (const key of ["q", "year", "office", "status", "deleted", "pageSize"]) {
      const v = fd.get(key);
      if (v != null && String(v).trim() !== "") {
        qs.set(key, String(v).trim());
      }
    }
    const s = qs.toString();
    window.location.assign(s ? `/records/full?${s}` : "/records/full");
  }

  return (
    <a href={href} onClick={handleClick} className={className}>
      Full view →
    </a>
  );
}
