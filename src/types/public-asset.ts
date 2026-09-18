export interface PublicAssetVerification {
  publicId: string;
  assetCode: string;
  name: string;
  category: string;
  assetType?: string | null;
  status: string;
  statusBadge: "active" | "assigned" | "pending" | "maintenance" | "disposed" | "default";
  condition?: string | null;
  department?: string | null;
  campus?: string | null;
  building?: string | null;
  roomNumber?: string | null;
  location?: string | null;
  assignedTo?: string | null;
  imageUrl?: string | null;
  verifiedAt: string;
}
