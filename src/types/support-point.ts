// src/types/support-point.ts

// Tipo retornado pela API
export type SupportPointType = "SHELTER" | "MEDICAL" | "SUPPLY" | "OTHER";

export interface SupportPoint {
  id: string;
  name: string;
  type: SupportPointType;
  latitude: number;
  longitude: number;
  capacity: number | null;
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
