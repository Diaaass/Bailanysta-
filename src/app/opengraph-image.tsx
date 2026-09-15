import { ImageResponse } from "next/og";
import { getTranslations } from "@/lib/i18n";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Bailanysta — социальная сеть с семантическим поиском";

export default async function Image() {
  const { t } = await getTranslations();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#0c1218",
          color: "#e3eaf1",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#3cb4d6" strokeWidth="1.6" />
            <path
              d="M3 12h18M12 3v18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"
              stroke="#3cb4d6"
              strokeWidth="1.1"
              opacity="0.55"
            />
            <circle cx="12" cy="12" r="3.4" stroke="#3cb4d6" strokeWidth="1.6" />
          </svg>
          <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: -0.5 }}>
            Bailanysta
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 60, lineHeight: 1.15, letterSpacing: -1 }}>
            {t.brand.taglineLead}
          </div>
          <div style={{ fontSize: 60, lineHeight: 1.15, color: "#3cb4d6" }}>
            {t.brand.taglineAccent}
          </div>
        </div>

        <div style={{ display: "flex", gap: 28, fontSize: 26, color: "#8d9aa8" }}>
          <div>Қазақша</div>
          <div>·</div>
          <div>Русский</div>
          <div>·</div>
          <div>English</div>
        </div>
      </div>
    ),
    size,
  );
}
