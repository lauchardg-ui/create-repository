export interface Hotel {
  id: string;
  name: string;
  location: string;
}

export interface DayAvailability {
  date: string;
  available: 'yes' | 'no' | 'unknown';
  price?: string;
  rooms: Room[];
}

export interface HotelAvailability {
  name: string;
  location: string;
  days: DayAvailability[];
}

export interface AvailabilityResponse {
  year: number;
  month: number;
  hotels: Record<string, HotelAvailability>;
}

export interface Room {
  name: string;
  price: string;
  description: string;
  bookingUrl: string | null;
}

export interface RoomResponse {
  hotel: Hotel;
  checkIn: string;
  nights: number;
  rooms: Room[];
  bookingUrl: string;
}
