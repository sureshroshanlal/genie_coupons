export async function listWithCounts() {
  const { data, error } = await supabase
    .from("merchant_category_counts_v")
    .select("id, slug, name, updated_at, stores_count, active_coupons_count")
    .order("name");
  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    updated_at: row.updated_at,
    counts: {
      stores: Number(row.stores_count || 0),
      coupons: Number(row.active_coupons_count || 0),
    },
  }));
}
