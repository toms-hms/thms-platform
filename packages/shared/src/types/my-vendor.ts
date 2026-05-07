import { TradeCategory } from './trade-category';

export interface ContractorDto {
  id: string;
  name: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  categories: TradeCategory[];
  zipCodes: string[];
  notes?: string | null;
  isGlobal: boolean;
}

export interface UserContractorDto {
  id: string;
  userId: string;
  contractorId: string;
  note?: string | null;
  contractor: ContractorDto;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserContractorInput {
  contractorId?: string;
  note?: string;
  // Used when creating a new private contractor on the fly
  name?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  categories?: TradeCategory[];
  zipCodes?: string[];
  notes?: string;
}
