export type DonationChannelType = "PIX_KEY" | "QR_CODE" | "EXTERNAL_LINK";

export interface DonationPoint {
  id: string;
  title: string;
  description: string;
  channelType: DonationChannelType;
  channelValue: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  error: string;
  details?: unknown;
}
