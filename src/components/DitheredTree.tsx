"use client";

export function DitheredTree() {
  return (
    <div className="tree-sway w-full max-w-sm aspect-square flex items-center justify-center">
      <svg
        viewBox="0 0 200 220"
        className="w-[85%] h-[85%] drop-shadow-sm"
        aria-hidden
      >
        <defs>
          {/* Dither pattern: grid of green dots */}
          <pattern
            id="dither-green"
            x="0"
            y="0"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="4" cy="4" r="1.2" fill="#166534" />
          </pattern>
          <pattern
            id="dither-green-light"
            x="0"
            y="0"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="3" cy="3" r="0.9" fill="#22c55e" />
          </pattern>
          <pattern
            id="dither-trunk"
            x="0"
            y="0"
            width="4"
            height="4"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="0.7" fill="#422006" />
          </pattern>
        </defs>
        {/* Trunk */}
        <rect
          x="85"
          y="140"
          width="30"
          height="70"
          fill="url(#dither-trunk)"
        />
        {/* Foliage: layered triangles for a simple tree shape */}
        <polygon
          points="100,20 170,120 30,120"
          fill="url(#dither-green-light)"
        />
        <polygon
          points="100,45 155,120 45,120"
          fill="url(#dither-green)"
        />
        <polygon
          points="100,70 140,120 60,120"
          fill="#14532d"
        />
      </svg>
    </div>
  );
}
