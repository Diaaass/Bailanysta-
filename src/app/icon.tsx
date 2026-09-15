import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0c1218",
          borderRadius: 7,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="#3cb4d6" strokeWidth="1.8" />
          <path
            d="M3 12h18M12 3v18"
            stroke="#3cb4d6"
            strokeWidth="1.2"
            opacity="0.6"
          />
          <circle cx="12" cy="12" r="3.4" stroke="#3cb4d6" strokeWidth="1.8" />
        </svg>
      </div>
    ),
    size,
  );
}
