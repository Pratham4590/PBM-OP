import { PlaceholderImage, ReportData } from "@/lib/types";

export const placeholderImages: PlaceholderImage[] = [
  {
    id: "login-bg",
    description: "A well-organized factory floor with rolls of paper, suggesting an industrial and efficient environment.",
    imageUrl: "https://picsum.photos/seed/factory/1920/1080",
    imageHint: "paper factory"
  }
];

export const recentRulings: ReportData[] = [
  {
    serialNo: "SN001",
    reelNo: "R101",
    reelWeight: 250,
    sheetsRuled: 12450,
    theoreticalSheets: 12500,
    difference: -50,
    itemRuled: "Single Line"
  },
  {
    serialNo: "SN002",
    reelNo: "R102",
    reelWeight: 248,
    sheetsRuled: 12420,
    theoreticalSheets: 12400,
    difference: 20,
    itemRuled: "Double Line"
  },
  {
    serialNo: "SN003",
    reelNo: "R103",
    reelWeight: 252,
    sheetsRuled: 12550,
    theoreticalSheets: 12600,
    difference: -50,
    itemRuled: "Square Line"
  },
  {
    serialNo: "SN004",
    reelNo: "R104",
    reelWeight: 250,
    sheetsRuled: 12530,
    theoreticalSheets: 12500,
    difference: 30,
    itemRuled: "Unruled"
  },
  {
    serialNo: "SN005",
    reelNo: "R105",
    reelWeight: 255,
    sheetsRuled: 12700,
    theoreticalSheets: 12750,
    difference: -50,
    itemRuled: "Single Line"
  }
];

export const chartData = [
    { date: "Jan", "Ruled": 4000, "Planned": 3800 },
    { date: "Feb", "Ruled": 3000, "Planned": 3200 },
    { date: "Mar", "Ruled": 5000, "Planned": 4800 },
    { date: "Apr", "Ruled": 4780, "Planned": 4900 },
    { date: "May", "Ruled": 5890, "Planned": 5500 },
    { date: "Jun", "Ruled": 4390, "Planned": 4500 },
    { date: "Jul", "Ruled": 4490, "Planned": 4300 },
]

export const stockSummary = {
    totalWeight: 15780, // kg
    totalReels: 63,
    paperTypes: [
        { name: "Maplitho", reels: 40 },
        { name: "Creamwove", reels: 23 },
    ]
}

export const productionSummary = {
    programsActive: 5,
    rulingsToday: 12,
    sheetsRuledToday: 148800,
    efficiency: 98.5, // percent
}
