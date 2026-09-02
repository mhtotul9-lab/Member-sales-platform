import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../../contexts/AuthContext";
import Nav from "../../../components/Nav";
import Loading from "../../../components/Loading";

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  return (
    <button
      type="button"
      className="btn btn-outline btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // clipboard permission denied — nothing more we can do here
        }
      }}
    >
      {copied ? "কপি হয়েছে ✓" : label}
    </button>
  );
}

function DownloadButton({ url, filename, label, getToken }) {
  const [state, setState] = useState("idle"); // idle | working | done | error

  async function handleDownload() {
    setState("working");
    try {
      const token = await getToken();
      const proxyUrl = `/api/member/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
      const res = await fetch(proxyUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "ডাউনলোড করা যায়নি।");
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
      setState("done");
      setTimeout(() => setState("idle"), 1500);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  }

  return (
    <button type="button" className="btn btn-outline btn-sm" disabled={state === "working"} onClick={handleDownload}>
      {state === "working" ? "ডাউনলোড হচ্ছে..." : state === "done" ? "ডাউনলোড হয়েছে ✓" : state === "error" ? "সমস্যা হয়েছে, আবার চেষ্টা করুন" : label}
    </button>
  );
}

export default function MemberProductDetail() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (!profile || profile.status !== "active") { router.replace("/pending"); return; }
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/member/products/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "লোড করা যায়নি।");
        setProduct(body.product);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [user, id]);

  if (loading || !profile) return null;

  const getToken = () => user.getIdToken();
  const slug = (product?.name || "product").replace(/[^a-zA-Z0-9\u0980-\u09FF]+/g, "-").slice(0, 40);

  return (
    <div className="shell">
      <Nav role={profile.role} active="products" />
      <div className="container" style={{ maxWidth: 720 }}>
        {error && <p className="error-text">{error}</p>}
        {!product && !error && <Loading />}

        {product && (
          <>
            <div className="card" style={{ marginBottom: 20 }}>
              {product.mainImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.mainImageUrl} alt={product.name} style={{ width: "100%", maxHeight: 320, objectFit: "cover", borderRadius: 8, marginBottom: 18 }} />
              )}
              <h1 style={{ fontSize: "1.35rem", marginBottom: 6 }}>{product.name}</h1>
              <div className="muted" style={{ marginBottom: 10 }}>৳{product.sellingPrice} {product.category && `· ${product.category}`}</div>
              <div style={{ marginBottom: 14 }}>
                <CopyButton text={product.name} label="প্রোডাক্টের নাম কপি করুন" />
              </div>
              {product.shortDescription && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ marginBottom: 6 }}>{product.shortDescription}</p>
                  <CopyButton text={product.shortDescription} label="সংক্ষিপ্ত বর্ণনা কপি করুন" />
                </div>
              )}
              {product.fullDescription && (
                <div>
                  <p className="muted" style={{ marginBottom: 6 }}>{product.fullDescription}</p>
                  <CopyButton text={product.fullDescription} label="বিস্তারিত বর্ণনা কপি করুন" />
                </div>
              )}
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: "1.05rem", marginBottom: 4 }}>মার্কেটিং মিডিয়া</h2>
              <p className="muted" style={{ marginBottom: 14, fontSize: "0.85rem" }}>
                বাটনে ক্লিক করলেই ছবি সরাসরি ডাউনলোড হয়ে যাবে।
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {product.mainImageUrl && (
                  <DownloadButton url={product.mainImageUrl} filename={`${slug}-main.jpg`} label="মেইন ছবি ডাউনলোড" getToken={getToken} />
                )}
                {(product.imageUrls || []).map((url, i) => (
                  <DownloadButton key={i} url={url} filename={`${slug}-${i + 1}.jpg`} label={`ছবি ${i + 1} ডাউনলোড`} getToken={getToken} />
                ))}
                {product.videoUrl && (
                  <a className="btn btn-outline btn-sm" href={product.videoUrl} target="_blank" rel="noreferrer">ভিডিও দেখুন</a>
                )}
              </div>
              {!product.mainImageUrl && !(product.imageUrls || []).length && !product.videoUrl && (
                <p className="muted">এই প্রোডাক্টের জন্য এখনো মিডিয়া যোগ করা হয়নি।</p>
              )}
            </div>

            <div className="card">
              <h2 style={{ fontSize: "1.05rem", marginBottom: 14 }}>মার্কেটিং টেক্সট</h2>

              {product.shortCaption && (
                <div style={{ marginBottom: 16 }}>
                  <p className="muted" style={{ marginBottom: 6 }}>{product.shortCaption}</p>
                  <CopyButton text={product.shortCaption} label="শর্ট ক্যাপশন কপি করুন" />
                </div>
              )}
              {product.longCaption && (
                <div style={{ marginBottom: 16 }}>
                  <p className="muted" style={{ marginBottom: 6, whiteSpace: "pre-wrap" }}>{product.longCaption}</p>
                  <CopyButton text={product.longCaption} label="লং ক্যাপশন কপি করুন" />
                </div>
              )}
              {product.whatsappMessage && (
                <div>
                  <p className="muted" style={{ marginBottom: 6, whiteSpace: "pre-wrap" }}>{product.whatsappMessage}</p>
                  <CopyButton text={product.whatsappMessage} label="হোয়াটসঅ্যাপ মেসেজ কপি করুন" />
                </div>
              )}
              {!product.shortCaption && !product.longCaption && !product.whatsappMessage && (
                <p className="muted">এই প্রোডাক্টের জন্য এখনো মার্কেটিং টেক্সট যোগ করা হয়নি।</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
