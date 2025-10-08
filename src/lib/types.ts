import { Timestamp } from "firebase/firestore";

export type UserRole = "Admin" | "Member" | "Operator";

export type User = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: Timestamp;
  themePreference: "light" | "dark" | "system";
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
  date?: Date | Timestamp;
  paperTypeId: string;
  length: number;
  gsm: number;
  totalWeight: number; // in kg
  numberOfReels: number;
};

export type Reel = {
  id: string;
  reelNo: string;
  paperTypeId: string;
  length: number;
  gsm: number;
  weight: number;
  status: 'Available' | 'Partially Used' | 'Finished';
  createdAt: Timestamp;
  createdBy: string;
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
  reelId: string;
  reelNo: string; // denormalized for easier display
  paperTypeId: string; // denormalized
  startWeight: number;
  endWeight: number;
  sheetsRuled: number;
  programId?: string;
  itemTypeId: string;
  cutoff: number;
  theoreticalSheets: number;
  difference: number;
  createdBy: string;
};


export type ReportData = {
    id: string;
    serialNo: string;
    reelNo: string;
    reelWeight: number;
    sheetsRuled: number;
    theoreticalSheets: number;
    difference: number;
    itemTypeId: string;
    paperTypeId: string;
};

export type PlaceholderImage = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
};
