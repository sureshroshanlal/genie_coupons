export function getStoreFromHost(host: string | null) {
  if (!host) return null;

  // strip port if present (localhost:3000)
  const cleanHost = host.split(':')[0];

  const parts = cleanHost.split('.');

  // geniecoupons.com → no store
  if (parts.length < 3) return null;

  // storename.geniecoupons.com
  return parts[0];
}
