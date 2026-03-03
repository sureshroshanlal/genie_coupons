import React, { useState, useRef, useEffect } from "react";

const DEBOUNCE_MS = 250;
const MAX_RESULTS = 6;
const MIN_QUERY_LEN = 3;

function highlight(name = "", q = "") {
  if (!q) return name;
  const lower = name.toLowerCase();
  const qi = q.toLowerCase();
  const idx = lower.indexOf(qi);
  if (idx === -1) return name;
  return (
    <>
      {name.slice(0, idx)}
      <span className="bg-brand-accent/20 text-brand-accent rounded px-0.5">
        {name.slice(idx, idx + q.length)}
      </span>
      {name.slice(idx + q.length)}
    </>
  );
}

export default function HeaderSearchIsland() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState(null);
  const [active, setActive] = useState(-1);

  const abortRef = useRef(null);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const rawBase = import.meta.env && import.meta.env.PUBLIC_API_BASE_URL;
  const base = rawBase.replace(/\/+$/, "");

  useEffect(() => {
    const onDoc = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) {
        setOpen(false);
        setActive(-1);
      }
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!q || q.trim().length < MIN_QUERY_LEN) {
      if (abortRef.current) {
        try {
          abortRef.current.abort();
        } catch {}
      }
      setItems([]);
      setOpen(false);
      setActive(-1);
      setErrMsg(null);
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) {
        try {
          abortRef.current.abort();
        } catch {}
      }
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;

      setLoading(true);
      setErrMsg(null);

      const params = new URLSearchParams({
        q: q.trim(),
        limit: String(MAX_RESULTS),
      });
      const endpoint = `${base}/search/stores?${params.toString()}`;

      try {
        const res = await fetch(endpoint, { method: "GET", signal });
        if (res.status === 404) {
          setErrMsg("Search endpoint not found (404).");
          setItems([]);
          setOpen(true);
          setActive(-1);
          return;
        }
        if (!res.ok) {
          const txt = await res.text().catch(() => null);
          setErrMsg(txt || `Search failed (${res.status})`);
          setItems([]);
          setOpen(true);
          setActive(-1);
          return;
        }

        const json = await res.json().catch(() => null);
        const list = (json?.data?.stores || []).slice(0, MAX_RESULTS);

        const normalized = list.map((s) => ({
          id: s.id,
          slug: s.slug,
          name: s.name || s.slug || "",
          logo_url: s.logo_url || null,
          category_names: Array.isArray(s.category_names)
            ? s.category_names
            : [],
        }));

        setItems(normalized);
        setOpen(true);
        setActive(-1);
      } catch (err) {
        if (err && err.name === "AbortError") return;
        setErrMsg("Network error while searching");
        setItems([]);
        setOpen(true);
        setActive(-1);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, base]);

  const onKeyDown = (e) => {
    if (!open) {
      if (e.key === "ArrowDown" && items.length > 0) {
        setOpen(true);
        setActive(0);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const sel = active >= 0 ? items[active] : items[0];
      if (sel) window.location.href = `/stores/${sel.slug}`;
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  const onClickItem = (s) => {
    if (s && s.slug) window.location.href = `/stores/${s.slug}`;
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <label htmlFor="header-search" className="sr-only">
        Search stores
      </label>
      <div className="relative">
        <input
          id="header-search"
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search stores..."
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="header-search-listbox"
          aria-activedescendant={active >= 0 ? `hs-item-${active}` : undefined}
          role="combobox"
          className="w-full pl-0 pr-0 py-2 text-sm bg-transparent"
          style={{
            WebkitAppearance: "none",
            appearance: "none",
            outline: "none",
            border: "none",
            background: "transparent",
            boxShadow: "none",
            borderRadius: 0,
            paddingLeft: 0,
            paddingRight: 0,
            color: "inherit",
          }}
        />

        {/* REMOVED the right-side icon/loader to avoid duplicate icons.
            If you want a loader, we can show it by toggling the left icon in header,
            or add a subtle inline spinner replacing the left icon when loading. */}
      </div>

      {open && (
        <ul
          id="header-search-listbox"
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-64 overflow-auto bg-white border border-gray-200 rounded shadow-lg"
          style={{ left: 0, boxSizing: "border-box" }}
        >
          {errMsg ? (
            <li className="p-3 text-sm text-red-600">{errMsg}</li>
          ) : items.length === 0 ? (
            <li className="p-3 text-sm text-gray-600">No stores found</li>
          ) : (
            items.map((s, i) => (
              <li
                id={`hs-item-${i}`}
                key={s.id || s.slug || i}
                role="option"
                aria-selected={i === active}
                onMouseDown={() => onClickItem(s)}
                className={`flex items-center gap-3 p-2 cursor-pointer ${
                  i === active
                    ? "bg-brand-primary/10 text-brand-primary"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center border rounded overflow-hidden bg-white">
                  {s.logo_url ? (
                    <img
                      src={s.logo_url}
                      alt={s.name}
                      className="object-contain w-full h-full"
                    />
                  ) : (
                    <div className="text-[10px] text-gray-400">Logo</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {highlight(s.name, q)}
                  </div>
                  {Array.isArray(s.category_names) &&
                    s.category_names.length > 0 && (
                      <div className="text-xs text-gray-500 truncate">
                        {s.category_names.join(", ")}
                      </div>
                    )}
                </div>
              </li>
            ))
          )}

          <li className="p-2 text-sm border-t">
            <a
              href={`/stores?q=${encodeURIComponent(q)}`}
              className="text-brand-secondary hover:underline"
            >
              See all results
            </a>
          </li>
        </ul>
      )}
    </div>
  );
}
