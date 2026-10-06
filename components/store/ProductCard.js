import s from "../../styles/store.module.css";
import { fmtPrice, toBnDigits, discountPercent } from "../../lib/store/shared";

const isNew = (p) => p.createdAt && Date.now() - Date.parse(p.createdAt) < 10 * 24 * 3600 * 1000;

export default function ProductCard({ p }) {
  const off = discountPercent(p.price, p.comparePrice);
  const two = p.images.length > 1;
  return (
    <a className={s.card} href={`/p/${p.slug}`}>
      <div className={`${s.imgBox} ${two ? s.hasTwo : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p.images[0] && <img className={s.img1} src={p.images[0]} alt={p.name} loading="lazy" />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {two && <img className={s.img2} src={p.images[1]} alt="" loading="lazy" />}
        <div className={s.badges}>
          {off > 0 && !p.soldOut && <span className={s.badge}>{toBnDigits(off)}% ছাড়</span>}
          {isNew(p) && !p.soldOut && <span className={`${s.badge} ${s.badgeNew}`}>নতুন</span>}
          {p.stockLeft > 0 && !p.soldOut && <span className={`${s.badge} ${s.badgeLow}`}>মাত্র {toBnDigits(p.stockLeft)}টি বাকি</span>}
        </div>
        {p.soldOut && <div className={s.soldOut}>স্টক আউট</div>}
        {!p.soldOut && <div className={s.quick}>অর্ডার করুন →</div>}
      </div>
      <div className={s.cardBody}>
        {p.category && <span className={s.cardCat}>{p.category}</span>}
        <div className={s.cardName}>{p.name}</div>
        <div className={s.priceRow}>
          <span className={s.price}>{fmtPrice(p.price)}</span>
          {p.comparePrice > p.price && <span className={s.old}>{fmtPrice(p.comparePrice)}</span>}
        </div>
      </div>
    </a>
  );
}
