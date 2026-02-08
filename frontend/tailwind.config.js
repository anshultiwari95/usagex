/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        usagex: {
          primary: "#4f46e5",
          "primary-hover": "#4338ca",
          dark: "#0f172a",
          surface: "#eef2ff",
          cream: "#f8fafc",
          accent: "#f59e0b",
          success: "#059669",
          "success-hover": "#047857",
          violet: "#7c3aed",
          "violet-light": "#a78bfa",
        },
      },
      backgroundImage: {
        "mesh-gradient": "radial-gradient(at 40% 20%, var(--tw-gradient-from) 0px, transparent 50%), radial-gradient(at 80% 0%, var(--tw-gradient-from) 0px, transparent 50%), radial-gradient(at 0% 50%, var(--tw-gradient-from) 0px, transparent 50%)",
      },
      transitionDuration: { DEFAULT: "200ms" },
      transitionTimingFunction: { smooth: "cubic-bezier(0.4, 0, 0.2, 1)" },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "glow": {
          "0%, 100%": { boxShadow: "0 0 20px -4px rgba(79, 70, 229, 0.25)" },
          "50%": { boxShadow: "0 0 32px -4px rgba(79, 70, 229, 0.35)" },
        },
        "shine": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "drift": {
          "0%, 100%": { transform: "translate(-50%, -50%) translate(0, 0)" },
          "25%": { transform: "translate(-50%, -50%) translate(30px, -20px)" },
          "50%": { transform: "translate(-50%, -50%) translate(-20px, 25px)" },
          "75%": { transform: "translate(-50%, -50%) translate(25px, 15px)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "fade-in": "fade-in 0.5s ease-out forwards",
        "gradient-shift": "gradient-shift 8s ease-in-out infinite",
        "float": "float 5s ease-in-out infinite",
        "glow": "glow 3s ease-in-out infinite",
        "shine": "shine 2.5s ease-in-out infinite",
        "scale-in": "scale-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "drift": "drift 25s ease-in-out infinite",
      },
      animationDelay: {
        100: "100ms",
        200: "200ms",
        300: "300ms",
        400: "400ms",
        500: "500ms",
        600: "600ms",
      },
    },
  },
  plugins: [],
};
