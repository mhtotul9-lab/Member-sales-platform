// ব্রাউজারেই ছবি ছোট করে (সর্বোচ্চ ১২০০px, JPEG) — যাতে ফ্রি Firestore এ জায়গা কম লাগে ও সাইট দ্রুত খোলে।
export function resizeImage(file, maxSide = 1200) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      let q = 0.85;
      let out = canvas.toDataURL("image/jpeg", q);
      while (out.length > 600000 && q > 0.4) { q -= 0.1; out = canvas.toDataURL("image/jpeg", q); }
      URL.revokeObjectURL(url);
      out.length > 850000 ? reject(new Error("ছবি অনেক বড়।")) : resolve(out);
    };
    img.onerror = () => reject(new Error("ছবি পড়া যায়নি।"));
    img.src = url;
  });
}
