import { useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import "../styles/globals.css";
import "../styles/store.css";
import { AuthProvider } from "../contexts/AuthContext";
import { track } from "../lib/pixel";

export default function App({ Component, pageProps }) {
  const router = useRouter();

  // প্রথম লোডের PageView _document-এর স্ক্রিপ্ট পাঠায়; এখানে শুধু পরের ক্লায়েন্ট-নেভিগেশনগুলো।
  useEffect(() => {
    const onDone = () => track("PageView");
    router.events.on("routeChangeComplete", onDone);
    return () => router.events.off("routeChangeComplete", onDone);
  }, [router.events]);

  return (
    <AuthProvider>
      <Head>
        <title>𝕵𝖔𝖑𝖗𝖆𝖘𝖎 পার্টনার</title>
      </Head>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
