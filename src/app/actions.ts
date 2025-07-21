'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// Define types
export interface TimeSlot {
  id: string;
  time: string;
  selections: number;
}

export interface Room {
  pin: string;
  timeSlots: TimeSlot[];
}

// In-memory store
const rooms = new Map<string, Room>();

function generatePin(): string {
  let pin;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
  do {
    pin = '';
    for (let i = 0; i < 4; i++) {
        pin += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms.has(pin)); // Ensure PIN is unique in our small in-memory store
  return pin;
}

const defaultTimeSlots: TimeSlot[] = [
    { id: '1', time: '9:00 - 9:30 AM', selections: 0 },
    { id: '2', time: '9:30 - 10:00 AM', selections: 0 },
    { id: '3', time: '10:00 - 10:30 AM', selections: 0 },
    { id: '4', time: '10:30 - 11:00 AM', selections: 0 },
    { id: '5', time: '11:00 - 11:30 AM', selections: 0 },
    { id: '6', time: '11:30 - 12:00 PM', selections: 0 },
    { id: '7', time: '1:00 - 1:30 PM', selections: 0 },
    { id: '8', time: '1:30 - 2:00 PM', selections: 0 },
    { id: '9', time: '2:00 - 2:30 PM', selections: 0 },
    { id: '10', time: '2:30 - 3:00 PM', selections: 0 },
    { id: '11', time: '3:00 - 3:30 PM', selections: 0 },
    { id: '12', time: '3:30 - 4:00 PM', selections: 0 },
];


export async function createRoom() {
  const pin = generatePin();
  const newRoom: Room = {
    pin,
    timeSlots: JSON.parse(JSON.stringify(defaultTimeSlots)) // deep copy to prevent mutation across rooms
  };
  rooms.set(pin, newRoom);
  redirect(`/${pin}`);
}

export async function getRoom(pin: string): Promise<Room | null> {
    const upperCasePin = pin.toUpperCase();
    if (rooms.has(upperCasePin)) {
        return rooms.get(upperCasePin)!;
    }
    // For this demo, we'll create a room if one with the PIN doesn't exist.
    // In a production app, you would likely return null and show a 404 page.
    const newRoom: Room = {
      pin: upperCasePin,
      timeSlots: JSON.parse(JSON.stringify(defaultTimeSlots))
    };
    rooms.set(upperCasePin, newRoom);
    return newRoom;
}


export async function selectTimeSlot(pin: string, timeSlotId: string) {
  const room = rooms.get(pin.toUpperCase());
  if (room) {
    const timeSlot = room.timeSlots.find(ts => ts.id === timeSlotId);
    if (timeSlot) {
      timeSlot.selections += 1;
      rooms.set(pin.toUpperCase(), room);
      revalidatePath(`/${pin}`);
      return { success: true };
    }
  }
  return { success: false, message: 'Room or time slot not found' };
}
