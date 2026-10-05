import Link from "next/link";

export const taka = (n) => "৳" + Number(n).toLocaleString("bn-BD");
export const discountPct = (p) => (p.comparePrice > p.sellingPrice ? Math.round((1 - p.sellingPrice / p.comparePrice) * 100) : 0);

export default function ProductCard({ p }) {
  const off = discountPct(p);
  return (
    <Link href={`/product/${p.id}`} className="st-card">
      <div className="st-card-img">
        {p.mainImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.mainImageUrl} alt={p.name} loading="lazy" />
        ) : <span>ছবি নেই</span>}
        {off > 0 && !p.outOfStock && <em className="st-badge">{off.toLocaleString("bn-BD")}% ছাড়</em>}
        {p.outOfStock && <em className="st-badge st-badge-out">স্টক শেষ</em>}
      </div>
      <div className="st-card-body">
        <h3>{p.name}</h3>
        <div className="st-price">
          <b>{taka(p.sellingPrice)}</b>
          {p.comparePrice > p.sellingPrice && <s>{taka(p.comparePrice)}</s>}
        </div>
        <span className="st-btn st-btn-block">{p.outOfStock ? "বিস্তারিত দেখুন" : "অর্ডার করুন"}</span>
      </div>
    </Link>
  );
}
