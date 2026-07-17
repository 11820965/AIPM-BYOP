import { useSyncExternalStore } from "react";

export type Booking = {
  id: string;
  workerId: string;
  workerName: string;
  service: string;
  slot: string;
  duration: number;
  address: string;
  notes: string;
  payment: "upi" | "card" | "cash";
  total: number;
  status: "confirmed" | "enroute" | "in_progress" | "completed" | "cancelled";
  createdAt: number;
};

const KEY = "gharseva.bookings";
let bookings: Booking[] = [];
const listeners = new Set<() => void>();

function load() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) bookings = JSON.parse(raw);
  } catch {}
}
function persist() {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(bookings));
}
load();

function emit() { listeners.forEach((l) => l()); }
function subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); }

export function createBooking(b: Omit<Booking, "id" | "createdAt" | "status">): Booking {
  const booking: Booking = {
    ...b,
    id: "BK" + Math.random().toString(36).slice(2, 8).toUpperCase(),
    createdAt: Date.now(),
    status: "confirmed",
  };
  bookings = [booking, ...bookings];
  persist();
  emit();
  return booking;
}

export function getBooking(id: string): Booking | undefined {
  return bookings.find((b) => b.id === id);
}

export function cancelBooking(id: string) {
  bookings = bookings.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b));
  persist(); emit();
}

export function useBookings(): Booking[] {
  return useSyncExternalStore(subscribe, () => bookings, () => bookings);
}