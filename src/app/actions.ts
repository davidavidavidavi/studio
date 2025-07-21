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

const defaultTimeStrings: string[] = [
    '9:00 - 9:30 AM',
    '9:30 - 10:00 AM',
    '10:00 - 10:30 AM',
    '10:30 - 11:00 AM',
    '11:00 - 11:30 AM',
    '11:30 - 12:00 PM',
    '1:00 - 1:30 PM',
    '1:30 - 2:00 PM',
    '2:00 - 2:30 PM',
    '2:30 - 3:00 PM',
    '3:00 - 3:30 PM',
    '3:30 - 4:00 PM',
];

function createTimeSlots(timeStrings: string[]): TimeSlot[] {
  return timeStrings.map((time, index) => ({
    id: `${index + 1}`,
    time,
    selections: 0,
  }));
}


export async function createRoom(timeStrings?: string[]) {
  const pin = generatePin();
  const timeSlots = createTimeSlots(timeStrings && timeStrings.length > 0 ? timeStrings : defaultTimeStrings);
  const newRoom: Room = {
    pin,
    timeSlots,
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
      timeSlots: createTimeSlots(defaultTimeStrings)
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
