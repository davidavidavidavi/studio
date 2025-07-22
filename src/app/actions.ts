
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, setDoc, updateDoc, runTransaction, arrayUnion } from 'firebase/firestore';

// Define types
export interface TimeSlot {
  id: string;
  time: string; // Stored as ISO 8601 string in UTC
  selections: number;
  voters: string[];
}

export interface Room {
  pin: string;
  timeSlots: TimeSlot[];
}

const roomsCollection = collection(db, 'rooms');

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
            voters: [],
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

export async function createRoom(pin: string, data?: { timeRange?: [number, number], duration?: number, timeStrings?: string[]}) {
  const upperCasePin = pin.toUpperCase();
  const roomRef = doc(roomsCollection, upperCasePin);
  
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
    pin: upperCasePin,
    timeSlots,
  };

  await setDoc(roomRef, newRoom);
  redirect(`/${upperCasePin}`);
}

export async function getRoom(pin: string): Promise<Room | null> {
    const upperCasePin = pin.toUpperCase();
    const roomRef = doc(roomsCollection, upperCasePin);
    const roomSnap = await getDoc(roomRef);

    if (roomSnap.exists()) {
        return roomSnap.data() as Room;
    }

    // To prevent 404s, let's create a default room if it doesn't exist
    const timeSlots = createTimeSlots(defaultTimeStrings);
    const newRoom: Room = {
      pin: upperCasePin,
      timeSlots,
    };
    await setDoc(roomRef, newRoom);
    return newRoom;
}


export async function selectTimeSlot(pin: string, timeSlotId: string, userId: string) {
  const roomRef = doc(roomsCollection, pin.toUpperCase());

  try {
    await runTransaction(db, async (transaction) => {
      const roomDoc = await transaction.get(roomRef);
      if (!roomDoc.exists()) {
        throw "Document does not exist!";
      }

      const roomData = roomDoc.data() as Room;
      
      const timeSlotIndex = roomData.timeSlots.findIndex(ts => ts.id === timeSlotId);
      if (timeSlotIndex === -1) {
        throw "Time slot not found!";
      }

      const timeSlot = roomData.timeSlots[timeSlotIndex];
      if (timeSlot.voters?.includes(userId)) {
        // User has already voted for this slot, so we do nothing.
        return;
      }
      
      // Create a new array with the updated timeslot
      const newTimeSlots = [...roomData.timeSlots];
      newTimeSlots[timeSlotIndex] = {
        ...timeSlot,
        selections: timeSlot.selections + 1,
        voters: [...(timeSlot.voters || []), userId]
      };

      transaction.update(roomRef, { timeSlots: newTimeSlots });
    });

    revalidatePath(`/${pin}`);
    return { success: true };
  } catch (e) {
    console.error("Transaction failed: ", e);
    return { success: false, message: 'An error occurred while voting.' };
  }
}
