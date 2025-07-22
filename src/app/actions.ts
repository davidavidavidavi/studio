
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// Define types
export interface TimeSlot {
  id: string;
  time: string; // Stored as ISO 8601 string in UTC
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
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30'
];

function createTimeSlots(timeStrings: string[]): TimeSlot[] {
    const today = new Date();
    today.setSeconds(0, 0);

    return timeStrings.map((time, index) => {
        const [hours, minutes] = time.split(':').map(Number);
        const date = new Date(today);
        date.setHours(hours, minutes);

        return {
            id: `${index + 1}`,
            time: date.toISOString(), // Store as ISO string (UTC)
            selections: 0,
        };
    });
}

function generateTimeSlots(startTime: number, endTime: number, duration: number): string[] {
    const slots: string[] = [];
    const today = new Date();
    today.setSeconds(0,0);

    const startDate = new Date(today);
    startDate.setHours(startTime, 0);

    const endDate = new Date(today);
    endDate.setHours(endTime, 0);

    let current = new Date(startDate);

    while (current.getTime() < endDate.getTime()) {
        const slotEnd = new Date(current.getTime() + duration * 60000);
        if (slotEnd.getTime() > endDate.getTime()) break;
        
        const hours = current.getHours().toString().padStart(2, '0');
        const minutes = current.getMinutes().toString().padStart(2, '0');
        slots.push(`${hours}:${minutes}`);
        current = slotEnd;
    }
    return slots;
}

export async function createRoom(data?: { timeRange?: [number, number], duration?: number, timeStrings?: string[]}) {
  const pin = generatePin();
  let timeSlots: TimeSlot[];

  if (data?.timeStrings && data.timeStrings.length > 0) {
    timeSlots = createTimeSlots(data.timeStrings);
  } else if (data?.timeRange && data.duration) {
    const timeStrings = generateTimeSlots(data.timeRange[0], data.timeRange[1], data.duration);
    timeSlots = createTimeSlots(timeStrings);
  } else {
    timeSlots = createTimeSlots(defaultTimeStrings);
  }
  
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
    return null;
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
