"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DemoRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-paper)",
        color: "var(--text-muted)",
        fontSize: 14,
      }}
    >
      Redirecting to Along Transit Experience...
    </div>
  );
}
