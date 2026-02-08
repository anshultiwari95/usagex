/**
 * Background: single image (bg1.jpg) with Ken Burns (pan/zoom) effect.
 * File: frontend/public/bg1.jpg
 */

export function AnimatedBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url(/bg1.jpg)",
          animation: "kenburns 24s ease-in-out infinite",
        }}
      />
      {/* Light overlay so text stays readable */}
      <div
        className="absolute inset-0 bg-black/25"
        aria-hidden
      />
    </div>
  );
}
