import { Hotel, AvailabilityResponse, RoomResponse } from '../types';

// Point this to your deployed backend server
// For local development: http://localhost:3001
// For production: your deployed server URL
const API_BASE = 'http://localhost:3001';

async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

export async function getHotels(): Promise<Hotel[]> {
  return apiFetch('/api/hotels');
}

export async function getMonthAvailability(year: number, month: number): Promise<AvailabilityResponse> {
  return apiFetch(`/api/availability/${year}/${month}`);
}

export async function getHotelAvailability(hotelId: string, year: number, month: number) {
  return apiFetch(`/api/availability/${hotelId}/${year}/${month}`);
}

export async function getRoomDetails(hotelId: string, checkIn: string, nights: number = 1): Promise<RoomResponse> {
  return apiFetch(`/api/rooms/${hotelId}/${checkIn}?nights=${nights}`);
}

export function getDirectBookingUrl(hotelSlug: string, checkIn: string, nights: number = 1): string {
  return `https://www.thepighotel.com/availability/?property=${hotelSlug}&checkin=${checkIn}&nights=${nights}`;
}
