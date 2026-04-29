import { TradeCategory } from './trade-category';

export interface ContractorDto {
  id: string;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  categories: TradeCategory[];
  zipCodes: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContractorInput {
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  categories: TradeCategory[];
  zipCodes?: string[];
  notes?: string;
}

export interface UpdateContractorInput {
  name?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  categories?: TradeCategory[];
  zipCodes?: string[];
  notes?: string;
}
