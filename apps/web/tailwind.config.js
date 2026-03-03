/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
    ],
    prefix: "",
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "#080809",
                foreground: "#E8E8E8",
                surface: {
                    DEFAULT: "#0D0D0F",
                    secondary: "#111122",
                },
                muted: {
                    DEFAULT: "#666",
                    foreground: "#666",
                },
                accent: {
                    teal: "#00FFD1",
                    orange: "#FF6B35",
                    purple: "#A78BFA",
                },
                primary: {
                    DEFAULT: "#00FFD1", // Teal as primary
                    foreground: "#080809",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                popover: {
                    DEFAULT: "#0D0D0F",
                    foreground: "#E8E8E8",
                },
                card: {
                    DEFAULT: "#0D0D0F",
                    foreground: "#E8E8E8",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            fontFamily: {
                mono: ["var(--font-dm-mono)", "monospace"],
                display: ["var(--font-syne)", "sans-serif"],
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
}
