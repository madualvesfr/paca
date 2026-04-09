/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        pink: {
          primary: "#FF8FB1",
          light: "#FFB5C9",
          dark: "#E5647A",
        },
        green: {
          primary: "#4ECDC4",
        },
        red: {
          primary: "#FF6B6B",
        },
      },
      fontFamily: {
        display: ["BricolageGrotesque"],
        body: ["DMSans"],
      },
    },
  },
  plugins: [],
};
