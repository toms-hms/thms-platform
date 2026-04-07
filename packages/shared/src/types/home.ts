export interface HomeDto {
  id: string;
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  notes?: string;
  fullAddress: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHomeInput {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
  notes?: string;
}

export interface UpdateHomeInput {
  name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
}

export enum HomeRole {
  OWNER = 'OWNER',
  MEMBER = 'MEMBER',
}

export interface UserHomeDto {
  userId: string;
  homeId: string;
  role: HomeRole;
}
