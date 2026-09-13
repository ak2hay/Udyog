export const brand = {
  name: "Rkyves",
  legalName: "Rkyves Technologies",
  tagline: "The operating system for your business",
  manufacturingTagline: "From order to production to payment — one connected system",
  colors: {
    primary: "#0F4C5C",
    primaryForeground: "#F7F9F8",
    accent: "#E36414",
    background: "#F4F7F6",
    surface: "#FFFFFF",
    muted: "#5C6B73",
    border: "#D5DEE3",
    danger: "#B91C1C",
    success: "#15803D",
    warning: "#B45309",
  },
} as const;

export type Brand = typeof brand;
