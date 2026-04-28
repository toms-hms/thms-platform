import { TradeCategory } from './trade-category';

export interface VendorDto {
  id: string;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  notes?: string;
  categories: TradeCategory[];
  zipCodes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateVendorInput {
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  notes?: string;
  categories: TradeCategory[];
  zipCodes?: string[];
}

export interface UpdateVendorInput {
  name?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  notes?: string;
  categories?: TradeCategory[];
  zipCodes?: string[];
}
