"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#14141C",
            color: "#F0EFE8",
            border: "1px solid rgba(200,255,0,0.12)",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
          },
          success: {
            iconTheme: { primary: "#C8FF00", secondary: "#0A0A0F" },
          },
          error: {
            iconTheme: { primary: "#FF6B6B", secondary: "#0A0A0F" },
          },
        }}
      />
    </QueryClientProvider>
  );
}
