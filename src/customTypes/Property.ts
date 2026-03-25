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
