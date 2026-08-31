// Wraps an API route handler so any uncaught error (Firestore errors,
// missing-index errors, etc.) always comes back as JSON with a clear
// message, instead of Vercel's default HTML error page — which is what
// was breaking the frontend's res.json() calls.
export function withErrorHandling(handler) {
  return async function wrapped(req, res) {
    try {
      return await handler(req, res);
    } catch (err) {
      console.error(err);
      const status = err.statusCode || 500;
      const message =
        err.code === 9 || /index/i.test(err.message || "")
          ? "একটা প্রয়োজনীয় Firestore index এখনো তৈরি হয়নি। Vercel-এর Function Logs-এ (Observability ট্যাব) সম্পূর্ণ এরর মেসেজ খুঁজুন — সেখানে একটা লিংক থাকবে ইনডেক্স তৈরি করার জন্য।"
          : err.message || "সার্ভারে একটা সমস্যা হয়েছে।";
      return res.status(status).json({ error: message });
    }
  };
}
