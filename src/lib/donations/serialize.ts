import type { DonationChannelType, DonationPoint } from "@/types/donation";

export type RawDonationChannel = {
  id: string;
  title: string;
  description: string;
  channelType: string;
  channelValue: string;
  createdAt: Date;
  updatedAt: Date;
};

export function toDonationPoint(row: RawDonationChannel): DonationPoint {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    channelType: row.channelType as DonationChannelType,
    channelValue: row.channelValue,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
