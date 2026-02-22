
export interface MasterArticle {
  code: string;
  description: string;
  gtin: string;
  origin: string;
  um: 'KG' | 'PZ';
  unitWeight: string; // Utilizzato solo se weightType è FIXED
  weightType: 'FIXED' | 'VARIABLE';
  defaultPackagingId: string;
}

export interface MasterPackaging {
  id: string;
  name: string;
  tare: string;
  width?: string; // Larghezza in mm
  depth?: string; // Profondità in mm
  height?: string; // Altezza in mm
}

export interface MasterPallet {
  id: string;
  name: string;
  tare: string;
  width?: string; // Larghezza in mm
  depth?: string; // Profondità in mm
  height?: string; // Altezza in mm
  maxLoad?: string; // Portata massima in kg
}

export interface MasterRecipient {
  code: string;
  name: string;
  address: string;
  vatNumber?: string; // Partita IVA
  email?: string;
  phone?: string;
}

export interface LinePallet {
  _id: string; // Unique ID for this instance in the line
  masterId: string;
  name: string;
  tare: string;
}

export interface PalletLine {
  id: string;
  articleCode: string;
  batch: string;
  count: string; // Numero di colli
  harvestDate: string;
  packagingId: string;
  packagingTare: string; // Tara unitaria imballaggio
  pallets: LinePallet[]; // Pallet fisici aggiunti alla riga
  grossWeight: string; // Peso lordo letto dalla bilancia in questo step
  netWeight: string; // Peso netto calcolato per questa riga
}

export interface PalletHistory {
  id: string;
  sscc: string;
  recipientCode: string;
  date: string;
  lines: PalletLine[];
  ddtId?: string; // Collegamento al DDT
  totalNetWeight: string;
  totalGrossWeight: string;
  totalTare: string;
}

export interface MasterDDT {
  id: string;
  number: string;
  date: string;
  recipientCode: string;
  palletIds: string[];
  notes?: string;
  carrierName: string;
  carrierAddress?: string;
  transportReason: string;
  goodsAppearance: string;
  transportStartDateTime: string;
  port: string; // Porto (es. Franco, Assegnato)
  licensePlate?: string; // Targa Motrice
  trailerPlate?: string; // Targa Rimorchio
  palletCount: number; // Posti Pallet a Terra
}

export type UserRole = 'ADMIN' | 'SPEDIZIONI' | 'OPERATORE' | 'AUDITOR';

export interface AppUser {
  id: string;
  fullName: string;
  role: UserRole;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entityType: 'PALLET' | 'DDT' | 'MASTER_DATA' | 'SETTINGS' | 'SECURITY';
  entityId?: string;
  summary: string;
}

export type ViewMode = 'DASHBOARD' | 'PALLET' | 'ARTICOLI' | 'IMBALLAGGI' | 'PALLET_MASTER' | 'CLIENTI' | 'STORICO' | 'DDT' | 'IMPOSTAZIONI';
