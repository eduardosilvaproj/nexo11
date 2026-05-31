export const tokens = {
  colors: {
    heading: "#0D1117",
    body: "#374151",
    muted: "#6B7A90",
    border: "#E8ECF2",
    accent: {
      blue: "#1E6FBF",
      green: "#12B76A",
      red: "#E53935",
      amber: "#E8A020",
      purple: "#7F77DD",
    },
    card: {
      bg: "#FFFFFF",
      border: "0.5px solid #E8ECF2",
    },
  },
  fontSize: {
    pageTitle: 22,
    sectionTitle: 15,
    body: 13,
    label: 11,
    kpiValue: 24,
    small: 10,
  },
  spacing: {
    page: "p-4 md:p-8",
    section: "space-y-6",
    cardPadding: "p-4 md:p-5",
  },
  radius: {
    card: "rounded-xl",
    badge: "rounded-full",
    button: "rounded-lg",
  },
} as const;

// Status badge presets
export const STATUS_COLORS = {
  success: { bg: "#D1FAE5", fg: "#05873C" },
  warning: { bg: "#FEF3C7", fg: "#E8A020" },
  error: { bg: "#FEE4E2", fg: "#E53935" },
  info: { bg: "#E6F0FF", fg: "#1E6FBF" },
  neutral: { bg: "#F1F5F9", fg: "#6B7A90" },
  purple: { bg: "#EEEDFB", fg: "#7F77DD" },
} as const;
