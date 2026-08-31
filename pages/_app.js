import Head from "next/head";
import "../styles/globals.css";
import { AuthProvider } from "../contexts/AuthContext";

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Head>
        <title>সেলসপার্টনার</title>
      </Head>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
