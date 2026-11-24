import Link from "next/link";
import { SMALL_BUTTON } from "./ui";

export function Pager({
  path,
  query,
  page,
  pages,
  total,
}: {
  path: string;
  query: Record<string, string>;
  page: number;
  pages: number;
  total: number;
}) {
  const href = (n: number) =>
    `${path}?${new URLSearchParams({ ...Object.fromEntries(Object.entries(query).filter(([, v]) => v)), page: String(n) })}`;
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>{total} in total</span>
      {pages > 1 && (
        <span className="flex items-center gap-2">
          {page > 1 && (
            <Link href={href(page - 1)} className={SMALL_BUTTON}>
              Previous
            </Link>
          )}
          Page {page} of {pages}
          {page < pages && (
            <Link href={href(page + 1)} className={SMALL_BUTTON}>
              Next
            </Link>
          )}
        </span>
      )}
    </div>
  );
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Read filters from the address bar; unknown values are ignored. */
export async function readFilters(
  searchParams: SearchParams,
  lists: Record<string, readonly string[]>,
) {
  const params = await searchParams;
  const one = (name: string) => {
    const value = params[name];
    return (Array.isArray(value) ? value[0] : value) ?? "";
  };
  const query: Record<string, string> = { q: one("q").trim().slice(0, 100) };
  for (const [name, allowed] of Object.entries(lists)) {
    query[name] = allowed.includes(one(name)) ? one(name) : "";
  }
  const number = Number(one("page"));
  const page = Number.isInteger(number) && number > 0 && number < 10_000 ? number : 1;
  const api = new URLSearchParams({ page: String(page) });
  for (const [name, value] of Object.entries(query)) if (value) api.set(name, value);
  return { query, api };
}
