import s from "../../styles/store.module.css";
import { fmtPrice, toBnDigits, discountPercent } from "../../lib/store/shared";

export default function ProductCard({ p }) {
  const off = discountPercent(p.price, p.comparePrice);
  return (
    <a className={s.card} href={`/p/${p.slug}`}>
      <div className={s.imgBox}>
        {p.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.images[0]} alt={p.name} loading="lazy" />
        ) : null}
        {off > 0 && !p.soldOut && <span className={s.badge}>{toBnDigits(off)}% ছাড়</span>}
        {p.soldOut && <div className={s.soldOut}>স্টক আউট</div>}
      </div>
      <div className={s.cardBody}>
        {p.category && <span className={s.cardCat}>{p.category}</span>}
        <div className={s.cardName}>{p.name}</div>
        <div className={s.priceRow}>
          <span className={s.price}>{fmtPrice(p.price)}</span>
          {p.comparePrice > p.price && <span className={s.old}>{fmtPrice(p.comparePrice)}</span>}
        </div>
        <div className={s.orderBtn}>{p.soldOut ? "বিস্তারিত দেখুন" : "অর্ডার করুন"}</div>
      </div>
    </a>
  );
}
