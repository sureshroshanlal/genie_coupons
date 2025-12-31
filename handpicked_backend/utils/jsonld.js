export function buildStoreJsonLd(store, origin) {
  const normalizeKeywords = (h1, meta) => {
    const raw = [h1, meta]
      .filter(Boolean)
      .flatMap(val =>
        typeof val === "string" ? val.split(",") : Array.isArray(val) ? val : []
      );
    const seen = new Set();
    const out = [];
    for (let k of raw) {
      if (!k) continue;
      const t = String(k).trim();
      if (!t) continue;
      if (seen.has(t.toLowerCase())) continue;
      seen.add(t.toLowerCase());
      out.push(t);
      if (out.length >= 25) break; // cap to avoid stuffing
    }
    return out;
  };

  const keywords = normalizeKeywords(store.h1keyword, store.meta_keywords);

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: store.name,
    url: `${origin}/stores/${store.slug}`,
    logo: store.logo_url || undefined,
    ...(keywords.length ? { keywords } : {}),
  };
}

export function buildArticleJsonLd(blog, origin) {
  if (!blog) return {};

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: blog.title || "",
    datePublished: blog.created_at || null,
    dateModified: blog.updated_at || null,
    author: blog.author?.name
      ? { "@type": "Person", name: blog.author.name }
      : undefined,
    mainEntityOfPage: blog.slug ? `${origin}/blogs/${blog.slug}` : origin,
    image: blog.hero_image_url || undefined,
  };
}

export function buildOfferJsonLd(coupon, origin) {
  // Build on-site URL for the coupon. If no slug is available, fallback to list.
  const couponUrl = coupon.slug
    ? `${origin}/coupons/${coupon.slug}`
    : `${origin}/coupons`;

  // Seller (Organization) from coupon.merchant
  const sellerName = coupon.merchant?.name || undefined;
  const sellerUrl = coupon.merchant?.slug
    ? `${origin}/stores/${coupon.merchant.slug}`
    : undefined;
  const sellerLogo = coupon.merchant?.logo_url || undefined;

  const seller = sellerName
    ? {
        "@type": "Organization",
        name: sellerName,
        url: sellerUrl,
        logo: sellerLogo,
      }
    : undefined;

  // Optional: wrap the item to give the Offer context
  const itemOffered = coupon.title
    ? {
        "@type": "Product",
        name: coupon.title,
        brand: sellerName ? { "@type": "Brand", name: sellerName } : undefined,
      }
    : undefined;

  const offer = {
    "@context": "https://schema.org",
    "@type": "Offer",
    url: couponUrl,
    // Include validity dates if present
    validFrom: coupon.starts_at || coupon.created_at || undefined,
    priceValidUntil: coupon.ends_at || undefined,
    // Availability is optional; only include if you have a clear rule
    availability: coupon.ends_at ? "https://schema.org/InStock" : undefined,
    // Price fields are optional; include if you have them in the future
    price: coupon.price != null ? String(coupon.price) : undefined,
    priceCurrency: coupon.currency || undefined,
    seller,
    itemOffered,
  };

  // Remove undefineds to keep JSON-LD clean
  Object.keys(offer).forEach((k) => offer[k] === undefined && delete offer[k]);
  if (offer.seller) {
    Object.keys(offer.seller).forEach(
      (k) => offer.seller[k] === undefined && delete offer.seller[k]
    );
  }
  if (offer.itemOffered) {
    Object.keys(offer.itemOffered).forEach(
      (k) => offer.itemOffered[k] === undefined && delete offer.itemOffered[k]
    );
  }

  return offer;
}
