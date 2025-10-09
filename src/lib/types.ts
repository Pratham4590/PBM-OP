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
  status: 'Available' | 'In Use' | 'Finished' | 'Hold';
  createdAt: Timestamp;
  createdBy: string;
  initialSheets: number;
  availableSheets: number;
  notes?: string;
  imageUrl?: string;
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

export type RulingEntry = {
  itemTypeId: string;
  sheetsRuled: number;
  cutoff: number;
  theoreticalSheets: number;
  difference: number;
  programId?: string;
  status: 'In Progress' | 'Half Finished' | 'Finished';
};

export type Ruling = {
  id: string;
  date: Date | Timestamp;
  reelId: string;
  reelNo: string; // denormalized
  paperTypeId: string; // denormalized
  startWeight: number;
  rulingEntries: RulingEntry[];
  totalSheetsRuled: number;
  createdBy: string;
};


export type PlaceholderImage = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
};

export type StatusLog = {
  id: string;
  reelId: string;
  oldStatus: Reel['status'];
  newStatus: Reel['status'];
  changedBy: string; // UID of the admin
  timestamp: Timestamp;
};
    
