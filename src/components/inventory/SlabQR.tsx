import QRCode from "qrcode";

/** Server component: a scannable QR that opens the slab's public passport (/s/[id]). */
export default async function SlabQR({ slabId, size = 56 }: { slabId: string; size?: number }) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = `${base}/s/${slabId}`;
  let dataUrl = "";
  try {
    dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 160 });
  } catch {
    return null;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt="slab QR"
      width={size}
      height={size}
      className="rounded-md bg-white p-0.5 shrink-0"
      title="Scan to open this slab"
    />
  );
}
