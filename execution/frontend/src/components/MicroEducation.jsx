// execution/frontend/src/components/MicroEducation.jsx
// One-time bottom sheet shown after the user's first verified food log.
// Uses localStorage key "khaaya-edu-shown" so it only fires once, ever.

import { useTheme } from "../theme";

export default function MicroEducation({ onDismiss }) {
  const { T } = useTheme();

  return (
    <div
      onClick={onDismiss}
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        animation: "eduFadeIn 0.25s ease",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480,
          background: T.bg,
          borderRadius: "28px 28px 0 0",
          padding: "0 20px 36px",
          boxSizing: "border-box",
          animation: "eduSlideUp 0.35s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 6px" }}>
          <div style={{ width: 40, height: 5, borderRadius: 3, background: T.border }} />
        </div>

        {/* Accent badge */}
        <div style={{
          width: 36, height: 36, borderRadius: 12,
          background: T.inputBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 17, margin: "8px auto 18px",
          opacity: 0.7,
        }}>
          ✅
        </div>

        {/* Message */}
        <div style={{
          textAlign: "center", fontSize: 16, color: T.text,
          fontWeight: 500, lineHeight: 1.55,
          marginBottom: 28, padding: "0 4px",
        }}>
          Khaaya draws on nutrition data from India's National Institute of Nutrition (NIN) rather than Western food databases, resulting in more accurate estimates for roti, dal, sabzi and other Indian dishes.
        </div>

        {/* CTA */}
        <button
          onClick={onDismiss}
          style={{
            width: "100%",
            background: T.btnPrimary,
            color: T.btnPrimaryText,
            border: "none",
            borderRadius: 16,
            padding: "16px 0",
            fontWeight: 700,
            fontSize: 17,
            cursor: "pointer",
            letterSpacing: 0.2,
            transition: "transform 0.15s",
          }}
          onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
          onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
        >
          Got it
        </button>
      </div>

      <style>{`
        @keyframes eduFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes eduSlideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
