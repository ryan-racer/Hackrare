"use client";

export function DitheredWave() {
  return (
    <div className="absolute inset-0 overflow-hidden dither-wave-bg">
      {/* Soft green gradient base */}
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background:
            "linear-gradient(180deg, #ecfdf5 0%, #d1fae5 25%, #a7f3d0 50%, #6ee7b7 75%, #34d399 100%)",
        }}
      />
      {/* Dither layer – large dots only */}
      <div
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: `radial-gradient(circle at center, #065f46 0.8px, transparent 0.8px)`,
          backgroundSize: "12px 12px",
        }}
      />
      {/* Subtle top-to-bottom darkening for depth */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background: "linear-gradient(180deg, transparent 0%, rgba(4, 47, 46, 0.15) 100%)",
        }}
      />
    </div>
  );
}
