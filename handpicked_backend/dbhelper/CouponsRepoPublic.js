// dbhelper/CouponsRepoPublic.js
import { supabase } from "../dbhelper/dbclient.js";

/**
 * CouponsRepo.list(params)
 *
 * Supports:
 * - cursor-based (keyset) pagination when `cursor` is provided (fast, recommended)
 * - fallback to page/limit (OFFSET) when `cursor` is not provided (keeps SSR page links working)
 *
 * Params:
 * { q, categorySlug, storeSlug, type, status, sort, page=1, limit=20, cursor=null, skipCount=false, mode="default" }
 *
 * Returns:
 * { data: [...], meta: { total, page, limit, next_cursor, prev_cursor, has_more } }
 */
export async function list({
  q,
  categorySlug,
  storeSlug,
  type,
  status,
  sort,
  page = 1,
  limit = 20,
  cursor = null, // new: opaque cursor string (base64 JSON)
  skipCount = false, // important: default false (pages that need pagination)
  mode = "default", // "homepage" | "default"
} = {}) {
  // normalize input
  const _limit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const _page = Math.max(Number(page) || 1, 1);

  // helpers to encode/decode opaque cursors
  const encodeCursor = (row) => {
    if (!row) return null;
    try {
      // store id and an optional key field (ends_at or created_at) if needed later
      const payload = {
        id: row.id,
        key: row.ends_at || row.published_at || null,
      };
      return Buffer.from(JSON.stringify(payload)).toString("base64");
    } catch (e) {
      return null;
    }
  };
  const decodeCursor = (c) => {
    if (!c) return null;
    try {
      return JSON.parse(Buffer.from(String(c), "base64").toString());
    } catch (e) {
      return null;
    }
  };

  // compute offset range for fallback (page)
  const from = (_page - 1) * _limit;
  const to = from + _limit - 1;

  // Resolve category name if filter present
  let categoryName = null;
  if (categorySlug) {
    const { data: cat, error: ce } = await supabase
      .from("merchant_categories")
      .select("name")
      .eq("slug", categorySlug)
      .maybeSingle();
    if (ce) throw ce;
    categoryName = cat?.name || null;
  }

  // Resolve merchant id if storeSlug given
  let merchantId = null;
  if (storeSlug) {
    const { data: store, error: se } = await supabase
      .from("merchants")
      .select("id")
      .eq("slug", storeSlug)
      .maybeSingle();
    if (se) throw se;
    merchantId = store?.id || null;
  }

  // ---------- HOMEPAGE mode: lightweight, no counts ----------
  if (mode === "homepage") {
    // minimal select — reduce payload and join cost
    let qBuilder = supabase
      .from("coupons")
      .select(
        "id, coupon_type, title, coupon_code, ends_at, click_count, merchant_id, merchants:merchant_id ( slug, name, logo_url )"
      )
      .eq("is_publish", true)
      .order("id", { ascending: false })
      .range(from, to);

    if (q) qBuilder = qBuilder.ilike("title", `%${q}%`);
    if (merchantId) qBuilder = qBuilder.eq("merchant_id", merchantId);
    if (type && type !== "all") qBuilder = qBuilder.eq("coupon_type", type);
    if (status !== "all") {
      qBuilder = qBuilder.or(
        `ends_at.is.null,ends_at.gt.${new Date().toISOString()}`
      );
    }
    // category filter: filter by merchant category if requested (avoid expensive relation joins)
    if (categoryName) {
      // Safer approach: resolve merchant ids for category first (cheap if category indexed)
      const { data: mids, error: mErr } = await supabase
        .from("merchants")
        .select("id")
        .contains("category_names", [categoryName]);
      if (!mErr && Array.isArray(mids) && mids.length) {
        const ids = mids.map((m) => m.id);
        qBuilder = qBuilder.in("merchant_id", ids);
      } else if (mErr) {
        console.warn(
          "Coupons.list(homepage): category merchant lookup failed",
          mErr
        );
      }
    }

    const { data, error } = await qBuilder;
    if (error) throw error;

    // Minimal mapping for homepage widgets
    const rows = (data || []).map((r) => ({
      id: r.id,
      title: r.title,
      code: r.coupon_type === "coupon" ? r.coupon_code || null : null,
      ends_at: r.ends_at,
      merchant_id: r.merchant_id || null,
      coupon_type: r.coupon_type,
      click_count: r.click_count,
      merchant: r.merchants
        ? {
            slug: r.merchants.slug,
            name: r.merchants.name,
            logo_url: r.merchants.logo_url,
          }
        : null,
      merchant_name: r.merchants?.name || null,
    }));

    return {
      data: rows,
      meta: { page: _page, limit: _limit, total: rows.length },
    };
  }

  // ---------- DEFAULT mode: support cursor (keyset) OR fallback to OFFSET ----------
  // If a cursor is provided, use keyset pagination (id DESC)
  if (cursor) {
    const decoded = decodeCursor(cursor);

    let qBuilder = supabase
      .from("coupons")
      .select(
        `id, coupon_type, title, description, type_text, coupon_code, ends_at, show_proof, proof_image_url, is_editor, click_count, merchant_id, merchants:merchant_id ( slug, name, logo_url )`
      )
      .eq("is_publish", true)
      .order("id", { ascending: false })
      .limit(_limit);

    // Apply keyset: id < decoded.id (fetch older rows)
    if (decoded && decoded.id) {
      qBuilder = qBuilder.lt("id", decoded.id);
    }

    if (q) qBuilder = qBuilder.ilike("title", `%${q}%`);
    if (merchantId) qBuilder = qBuilder.eq("merchant_id", merchantId);
    if (type && type !== "all") qBuilder = qBuilder.eq("coupon_type", type);
    if (status !== "all") {
      qBuilder = qBuilder.or(
        `ends_at.is.null,ends_at.gt.${new Date().toISOString()}`
      );
    }
    if (categoryName) {
      const { data: mids, error: mErr } = await supabase
        .from("merchants")
        .select("id")
        .contains("category_names", [categoryName]);
      if (!mErr && Array.isArray(mids) && mids.length) {
        const ids = mids.map((m) => m.id);
        qBuilder = qBuilder.in("merchant_id", ids);
      } else if (mErr) {
        console.warn("Coupons.list: category merchant lookup failed", mErr);
      }
    }

    const { data, error } = await qBuilder;
    if (error) throw error;

    const rows = (data || []).map((r) => ({
      id: r.id,
      title: r.title,
      code: r.coupon_type === "coupon" ? r.coupon_code || null : null,
      ends_at: r.ends_at,
      merchant_id: r.merchant_id || null,
      coupon_type: r.coupon_type,
      description: r.description,
      type_text: r.type_text,
      show_proof: !!r.show_proof,
      proof_image_url: r.proof_image_url || null,
      is_editor: !!r.is_editor,
      click_count: r.click_count || 0,
      merchant: r.merchants
        ? {
            slug: r.merchants.slug,
            name: r.merchants.name,
            logo_url: r.merchants.logo_url,
          }
        : null,
      merchant_name: r.merchants?.name || null,
    }));

    const lastRow = rows.length ? rows[rows.length - 1] : null;
    const nextCursor = encodeCursor(lastRow);
    const hasMore = rows.length === _limit;

    // For cursor mode, total count may be expensive — keep null to indicate unknown
    return {
      data: rows,
      meta: {
        page: _page,
        limit: _limit,
        total: null,
        next_cursor: nextCursor,
        prev_cursor: null,
        has_more: hasMore,
      },
    };
  }

  // FALLBACK: existing OFFSET pagination for SSR (page param)
  let mainQuery = supabase
    .from("coupons")
    .select(
      `id, coupon_type, title, description, type_text, coupon_code, ends_at, show_proof, proof_image_url, is_editor, click_count, merchant_id, merchants:merchant_id ( slug, name, logo_url )`
    )
    .eq("is_publish", true)
    .range(from, to);

  if (q) mainQuery = mainQuery.ilike("title", `%${q}%`);
  if (merchantId) mainQuery = mainQuery.eq("merchant_id", merchantId);
  if (type && type !== "all") mainQuery = mainQuery.eq("coupon_type", type);
  if (status !== "all") {
    mainQuery = mainQuery.or(
      `ends_at.is.null,ends_at.gt.${new Date().toISOString()}`
    );
  }
  if (categoryName) {
    // filter by merchant category: resolve merchant ids first (uses index on merchants.category_names)
    const { data: mids, error: mErr } = await supabase
      .from("merchants")
      .select("id")
      .contains("category_names", [categoryName]);
    if (!mErr && Array.isArray(mids) && mids.length) {
      const ids = mids.map((m) => m.id);
      mainQuery = mainQuery.in("merchant_id", ids);
    } else if (mErr) {
      console.warn("Coupons.list: category merchant lookup failed", mErr);
    }
  }

  // Sorting
  if (sort === "ending") {
    mainQuery = mainQuery.order("ends_at", {
      ascending: true,
      nullsFirst: false,
    });
  } else if (sort === "trending") {
    // trending relies on a click_count column or similar - prefer pre-aggregated metric
    mainQuery = mainQuery
      .order("click_count", { ascending: false })
      .order("id", { ascending: false });
  } else if (sort === "editor") {
    mainQuery = mainQuery
      .order("is_editor", { ascending: false })
      .order("id", { ascending: false });
  } else {
    mainQuery = mainQuery.order("id", { ascending: false });
  }

  const { data, error } = await mainQuery;
  if (error) throw error;

  // Count only when required (skipCount === false)
  let total = null;
  if (!skipCount) {
    let cQuery = supabase
      .from("coupons")
      .select("id", { count: "exact", head: true })
      .eq("is_publish", true);

    if (q) cQuery = cQuery.ilike("title", `%${q}%`);
    if (merchantId) cQuery = cQuery.eq("merchant_id", merchantId);
    if (type && type !== "all") cQuery = cQuery.eq("coupon_type", type);
    if (status !== "all") {
      cQuery = cQuery.or(
        `ends_at.is.null,ends_at.gt.${new Date().toISOString()}`
      );
    }
    if (categoryName) {
      // same merchant ids resolution as above
      const { data: mids2, error: mErr2 } = await supabase
        .from("merchants")
        .select("id")
        .contains("category_names", [categoryName]);
      if (!mErr2 && Array.isArray(mids2) && mids2.length) {
        const ids2 = mids2.map((m) => m.id);
        cQuery = cQuery.in("merchant_id", ids2);
      } else if (mErr2) {
        console.warn(
          "Coupons.list: category merchant lookup for count failed",
          mErr2
        );
      }
    }

    const { count, error: cErr } = await cQuery;
    if (cErr) throw cErr;
    total = count || 0;
  }

  // Shape result (map merchants' minimal info where needed on UI; join later on client or via separate merchant fetch)
  const rows = (data || []).map((r) => ({
    id: r.id,
    title: r.title,
    code: r.coupon_type === "coupon" ? r.coupon_code || null : null,
    ends_at: r.ends_at,
    merchant_id: r.merchant_id || null,
    coupon_type: r.coupon_type,
    description: r.description,
    type_text: r.type_text,
    show_proof: !!r.show_proof,
    proof_image_url: r.proof_image_url || null,
    is_editor: !!r.is_editor,
    click_count: r.click_count || 0,
    merchant: r.merchants
      ? {
          slug: r.merchants.slug,
          name: r.merchants.name,
          logo_url: r.merchants.logo_url,
        }
      : null,
    merchant_name: r.merchants?.name || null,
  }));

  return {
    data: rows,
    meta: { total: total || rows.length, page: _page, limit: _limit },
  };
}

export async function listForStore({
  merchantId,
  type,
  page,
  limit,
  sort,
  skipCount = false,
}) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("coupons")
    .select(
      "id, coupon_type, title, description, type_text, coupon_code, ends_at, show_proof, proof_image_url, is_editor, click_count, merchant_id, merchants:merchant_id ( slug, name, logo_url )"
    )
    .eq("merchant_id", merchantId)
    .eq("is_publish", true)
    .range(from, to);

  if (type !== "all") query = query.eq("coupon_type", type);

  // Sorting optimizations
  if (sort === "ending") {
    query = query.order("ends_at", { ascending: true, nullsFirst: false });
  } else if (sort === "editor") {
    query = query
      .order("is_editor", { ascending: false })
      .order("id", { ascending: false });
  } else {
    query = query.order("id", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw error;

  // Count query only if needed
  let total = null;
  if (!skipCount) {
    let cQuery = supabase
      .from("coupons")
      .select("id", { count: "exact", head: true })
      .eq("merchant_id", merchantId)
      .eq("is_publish", true);
    if (type !== "all") cQuery = cQuery.eq("coupon_type", type);

    const { count, error: cErr } = await cQuery;
    if (cErr) throw cErr;
    total = count || 0;
  }

  const items = (data || []).map((r) => ({
    id: r.id,
    coupon_type: r.coupon_type,
    title: r.title,
    description: r.description,
    type_text: r.type_text,
    coupon_code: r.coupon_type === "coupon" ? r.coupon_code || null : null,
    ends_at: r.ends_at,
    show_proof: !!r.show_proof,
    proof_image_url: r.proof_image_url || null,
    is_editor: !!r.is_editor,
    click_count: r.click_count || 0,
    merchant_id: r.merchant_id || null,
    merchant: r.merchants
      ? {
          slug: r.merchants.slug,
          name: r.merchants.name,
          logo_url: r.merchants.logo_url,
        }
      : null,
    merchant_name: r.merchants?.name || null,
  }));

  return { items, total: total ?? items.length };
}

/**
 * Get an offer by id with merchant info.
 * Mirrors the shape used in controllers/islands.
 *
 * Returns null if not found.
 */
export async function getById(offerId) {
  if (!offerId) return null;

  // Use same merchant join shorthand as in your other repo methods
  const { data, error } = await supabase
    .from("coupons")
    .select(
      `id,
       coupon_type,
       title,
       description,
       type_text,
       coupon_code,
       ends_at,
       click_count,
       merchant_id,
       merchants:merchant_id (
         id,
         slug,
         name,
         logo_url,
         aff_url,
         web_url
       )`
    )
    .eq("id", offerId)
    .maybeSingle();

  if (error) {
    console.error("CouponsRepo.getById supabase error:", error);
    throw error;
  }
  if (!data) return null;

  // Shape to the expected object
  return {
    id: data.id,
    title: data.title,
    code: data.coupon_type === "coupon" ? data.coupon_code || null : null,
    type: data.coupon_type,
    description: data.description,
    type_text: data.type_text,
    ends_at: data.ends_at,
    click_count: data.click_count || 0,
    merchant_id: data.merchant_id,
    merchant: data.merchants
      ? {
          id: data.merchants.id,
          slug: data.merchants.slug,
          name: data.merchants.name,
          aff_url: data.merchants.aff_url,
          web_url: data.merchants.web_url,
          logo_url: data.merchants.logo_url,
        }
      : null,
  };
}

/**
 * Increment click_count for an offer (atomic, RPC only).
 * Assumes increment_coupon_click_count(p_id bigint) RETURNS TABLE(click_count bigint).
 */
export async function incrementClickCount(offerId) {
  if (!offerId) throw new Error("offerId required");

  const { data, error } = await supabase.rpc("increment_coupon_click_count", {
    p_id: Number(offerId),
  });

  if (error) {
    console.error("incrementClickCount: rpc error:", error);
    throw error;
  }

  if (
    Array.isArray(data) &&
    data.length > 0 &&
    data[0].click_count !== undefined
  ) {
    return Number(data[0].click_count);
  }

  // fallback for unexpected shapes
  return Number(Array.isArray(data) ? data[0] : data);
}

export async function listTopByClicks(merchantId, limit = 3) {
  if (!merchantId) return [];

  // Select relevant fields; avoid exposing coupon_code.
  const { data, error } = await supabase
    .from("coupons")
    .select(
      `id,
       coupon_type,
       title,
       description,
       type_text,
       ends_at,
       click_count,
       proof_image_url,
       merchant_id`
    )
    .eq("merchant_id", merchantId)
    .eq("is_publish", true)
    .order("click_count", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("listTopByClicks supabase error:", error);
    return [];
  }
  if (!data) return [];

  // Map to safe shape
  return data.map((r) => ({
    id: r.id,
    title: r.title,
    coupon_type: r.coupon_type,
    short_desc: r.description,
    type_text: r.type_text,
    banner_image: r.proof_image_url || null,
    expires_at: r.ends_at,
    click_count: r.click_count || 0,
    merchant_id: r.merchant_id,
    code: null, // do not expose codes
  }));
}

export async function countRecentForStore({
  merchantId,
  days = 30,
  limit = 10,
}) {
  if (!merchantId) return { total_offers_added_last_30d: 0, recent: [] };

  // compute cutoff ISO
  const cutoff = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000
  ).toISOString();

  // Total count (use exact count head)
  try {
    const cQuery = supabase
      .from("coupons")
      .select("id", { count: "exact", head: true })
      .eq("merchant_id", merchantId)
      .eq("is_publish", true)
      .or(`published_at.gte.${cutoff},created_at.gte.${cutoff}`);

    const { count, error: cErr } = await cQuery;
    if (cErr) {
      console.warn("countRecentForStore count error:", cErr);
    }

    const total = count || 0;

    // Recent items list — prefer published_at desc, fallback to created_at
    const { data: recentRows, error: rErr } = await supabase
      .from("coupons")
      .select(
        "id, coupon_type, title, description, published_at, created_at, type_text"
      )
      .eq("merchant_id", merchantId)
      .eq("is_publish", true)
      .or(`published_at.gte.${cutoff},created_at.gte.${cutoff}`)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (rErr) {
      console.warn("countRecentForStore recent fetch error:", rErr);
      return { total_offers_added_last_30d: total, recent: [] };
    }

    const recent = (recentRows || []).map((r) => ({
      id: r.id,
      title: r.title,
      type: r.coupon_type,
      short_desc: r.description,
      published_at: r.published_at || r.created_at || null,
    }));

    return { total_offers_added_last_30d: total, recent };
  } catch (e) {
    console.error("countRecentForStore exception:", e);
    return { total_offers_added_last_30d: 0, recent: [] };
  }
}
