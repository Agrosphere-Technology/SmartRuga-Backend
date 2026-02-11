export function buildAnimalQrUrl(publicId: string) {
  const base = (process.env.QR_BASE_URL || "").replace(/\/+$/, "");
  if (!base) throw new Error("QR_BASE_URL is not set");
  return `${base}/a/${publicId}`;
}
