import { Timestamp } from "firebase/firestore";

export type UserRole = "Admin" | "Member" | "Operator";

export type User = {
  id: string;
  email?: string;
  displayName?: string;
  role: UserRole;
  createdAt?: Timestamp;
  themePreference?: "light" | "dark" | "system";
};

export type PaperType = {
  id: string;
  paperName: string;
  gsm: number;
  length: number; // in cm
};

export type ItemType = {
  id: string;
  itemName:string;
  shortCode: string;
};

export type Stock = {
  id: string;
  date: Date | Timestamp;
  paperTypeId: string;
  length: number;
  gsm: number;
  totalWeight: number; // in kg
  numberOfReels: number;
};

export type Program = {
  id: string;
  date: Date | Timestamp;
  paperTypeId: string;
  gsm: number;
  length: number;
  cutoff: number;
  itemTypeId: string;
  notebookPages: number;
  coverIndex: number;
  ups: number;
  piecesPerBundle: number;
  bundlesRequired: number;
  brand: string;
  // Auto-calculated fields
  reamWeight: number;
  totalSheetsRequired: number;
  counting: number;
};

export type Ruling = {
  id: string;
  date: Date | Timestamp;
  serialNo: string;
  reelNo: string;
  paperTypeId: string;
  reelWeight: number; // in kg
  status: "Partially Used" | "Finished";
  entries: RulingEntry[];
};

export type RulingEntry = {
  id: string;
  itemTypeId: string;
  sheetsRuled: number;
  programId?: string;
  cutoff: number; // Stored here for both program/non-program ruling for consistency
  theoreticalSheets: number;
  difference: number;
};

export type ReportData = {
    serialNo: string;
    reelNo: string;
    reelWeight: number;
    sheetsRuled: number;
    theoreticalSheets: number;
    difference: number;
    itemRuled: string;
};

export type PlaceholderImage = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
};
