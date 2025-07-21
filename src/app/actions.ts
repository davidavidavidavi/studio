
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

function formatTime(date: Date) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function generateTimeSlots(startTime: number, endTime: number, duration: number): string[] {
    const slots: string[] = [];
    const startDate = new Date();
    startDate.setHours(startTime, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(endTime, 0, 0, 0);

    let current = new Date(startDate);

    while (current.getTime() < endDate.getTime()) {
        const slotEnd = new Date(current.getTime() + duration * 60000);
        if (slotEnd.getTime() > endDate.getTime()) break;
        slots.push(`${formatTime(current)} - ${formatTime(slotEnd)}`);
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
