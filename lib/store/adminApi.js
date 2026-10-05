import { requireAdmin } from "../firebaseAdmin";

// অ্যাডমিন API রুটের জন্য: টোকেন চেক করে, ব্যর্থ হলে JSON এরর পাঠায়।
export async function guardAdmin(req, res) {
  try {
    return await requireAdmin(req);
  } catch (err) {
    res.status(err.statusCode || 401).json({ error: err.message });
    return null;
  }
}
