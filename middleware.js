// jolrasi.com (ও www.jolrasi.com) এর হোম পেজে ইকমার্স স্টোর দেখায়।
// jolrasipartner.vercel.app এর হোম পেজ আগের মতোই থাকে — কোনো বিদ্যমান ফাইল বদলানো হয়নি।
import { NextResponse } from "next/server";

const STORE_HOSTS = ["jolrasi.com", "www.jolrasi.com"];

export function middleware(req) {
  const host = (req.headers.get("host") || "").toLowerCase().split(":")[0];
  if (STORE_HOSTS.includes(host) && req.nextUrl.pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/store";
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/"] };
