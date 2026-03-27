export interface PropertyAttribute {
  trait_type: string;
  value: string | number;
}

export interface PropertyMetadata {
  id: string;
  name: string;
  address: string;
  description: string;
  image: string;
  attributes: PropertyAttribute[];
}

export interface Property {
  id: number;
  propertyPrice: string;
  downPayment: string;
  accountBalance: string;
  buyer: string;
  seller: string;
  lender: string;
  inspector: string;
  isListed: boolean;
  inspectionPassed: boolean;
}

export type RoleType = "buyer" | "seller" | "lender" | "inspector";
