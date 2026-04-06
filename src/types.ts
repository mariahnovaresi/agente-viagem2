export type SearchOption = 1 | 2 | 3 | 4;

export type ViewOption = 'milhas' | 'moeda' | 'ambos';

export type DurationOption = number | 'flexivel' | 'fixed';

export interface FlightSearchData {
  option: SearchOption;
  origin: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  view: ViewOption;
  duration: DurationOption;
}

export interface FlightResult {
  airline: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  priceCurrency?: number;
  priceMiles?: number;
  link: string;
  durationDays: number;
}
