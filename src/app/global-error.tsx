"use client";

/**
 * Last resort: catches failures in the root layout itself, where the app's
 * providers and stylesheet may not have loaded. It must render its own <html>
 * and <body>, and cannot rely on Tailwind, so the styles here are inline.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "1.5rem",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          background: "#fbfaf7",
          color: "#131611",
        }}
      >
        <main style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: ".5rem" }}>
            QuitTobacco couldn&apos;t start
          </h1>
          <p style={{ color: "#5b6157", marginBottom: "1.5rem" }}>
            Please check your connection and try again. Nothing saved on this
            phone has been lost.
          </p>
          <button
            onClick={reset}
            style={{
              minHeight: "3rem",
              padding: "0 1.5rem",
              borderRadius: "999px",
              border: "none",
              background: "#0f7060",
              color: "#fff",
              fontSize: "1rem",
              fontWeight: 600,
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ marginTop: "1rem", fontSize: ".75rem", color: "#5b6157" }}>
              Reference: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
