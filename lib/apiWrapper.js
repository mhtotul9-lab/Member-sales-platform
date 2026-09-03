// Wraps an API route handler so any uncaught error (Firestore errors,
// missing-index errors, etc.) always comes back as JSON with a clear
// message, instead of Vercel's default HTML error page — which is what
// was breaking the frontend's res.json() calls.
//
// Deliberately verbose: the real error text (including any Firestore
// "create this index here: <link>" message) is always sent to the client,
// not hidden behind a generic message. This app's admin panel is the only
// consumer of these errors, so exposing internal detail here is a feature,
// not a leak — it lets the admin fix Firestore index problems themselves
// without needing to open Vercel's logs at all.
export function withErrorHandling(handler) {
  return async function wrapped(req, res) {
    try {
      return await handler(req, res);
    } catch (err) {
      console.error(err);
      const status = err.statusCode || 500;
      const isIndexError = err.code === 9 || /index/i.test(err.message || "");
      const prefix = isIndexError
        ? "একটা প্রয়োজনীয় Firestore index এখনো তৈরি হয়নি। নিচের এরর মেসেজে থাকা লিংকে ক্লিক করে সরাসরি index তৈরি করুন:\n\n"
        : "";
      const message = prefix + (err.message || "সার্ভারে একটা সমস্যা হয়েছে।");
      return res.status(status).json({ error: message });
    }
  };
}
