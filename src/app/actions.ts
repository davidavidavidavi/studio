
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, setDoc, updateDoc, runTransaction, arrayUnion, arrayRemove } from 'firebase/firestore';

// Define types
export interface TimeSlot {
  id: string;
  time: string; // Stored as ISO 8601 string in UTC
  selections: number;
  voters: string[];
}

export interface Room {
  pin: string;
  date: string; // Stored as ISO 8601 string (date part only, e.g., '2024-07-23')
  timeSlots: TimeSlot[];
}

const roomsCollection = collection(db, 'rooms');

const defaultTimeStrings: string[] = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30'
];

function createTimeSlots(timeStrings: string[], forDate: Date): TimeSlot[] {
    const today = forDate;
    today.setSeconds(0, 0);

    return timeStrings.map((time, index) => {
        const [hours, minutes] = time.split(':').map(Number);
        
        const date = new Date(today);
        date.setHours(hours, minutes, 0, 0);

        return {
            id: `${index + 1}`,
            time: date.toISOString(), // Store as ISO string (UTC)
            selections: 0,
            voters: [],
        };
    });
}

function generateTimeSlots(startTime: number, endTime: number, duration: number, forDate: Date): string[] {
    const slots: string[] = [];

    const startDate = new Date(forDate);
    startDate.setHours(startTime, 0, 0, 0);

    const endDate = new Date(forDate);
    endDate.setHours(endTime, 0, 0, 0);

    let current = new Date(startDate);

    while (current.getTime() < endDate.getTime()) {
        const slotEnd = new Date(current.getTime() + duration * 60000);
        if (slotEnd.getTime() > endDate.getTime()) break;
        
        // We generate the string representation in UTC to be stored,
        // the client will format it to local time.
        const hours = current.getUTCHours().toString().padStart(2, '0');
        const minutes = current.getUTCMinutes().toString().padStart(2, '0');
        slots.push(`${hours}:${minutes}`);
        current = slotEnd;
    }
    return slots;
}

export async function createRoom(pin: string, data?: { timeRange?: [number, number], duration?: number, timeStrings?: string[], date?: string }) {
  const upperCasePin = pin.toUpperCase();
  const roomRef = doc(roomsCollection, upperCasePin);
  
  let timeSlots: TimeSlot[];
  // The date string from the client includes timezone info.
  // new Date() will correctly parse it into a Date object representing that point in time.
  const roomDate = data?.date ? new Date(data.date) : new Date();

  // We want to preserve the YYYY-MM-DD from the user's local perspective for display purposes.
  const localDate = new Date(roomDate.getFullYear(), roomDate.getMonth(), roomDate.getDate());


  if (data?.timeStrings && data.timeStrings.length > 0) {
    // This path is used for default room creation, let's make it use local time too.
    const forDate = new Date(localDate);
    timeSlots = createTimeSlots(data.timeStrings, forDate);
  } else if (data?.timeRange && data.duration) {
    const forDate = new Date(localDate);
    const timeStrings = generateTimeSlots(data.timeRange[0], data.timeRange[1], data.duration, forDate);
    timeSlots = createTimeSlots(timeStrings, forDate);
  } else {
    // Default room creation
    const forDate = new Date(localDate);
    timeSlots = createTimeSlots(defaultTimeStrings, forDate);
  }
  
  const newRoom: Room = {
    pin: upperCasePin,
    date: localDate.toISOString().split('T')[0], // Store just the date part, e.g., '2024-07-25'
    timeSlots,
  };

  await setDoc(roomRef, newRoom);
  return upperCasePin;
}

export async function getRoom(pin: string): Promise<Room | null> {
    const upperCasePin = pin.toUpperCase();
    const roomRef = doc(roomsCollection, upperCasePin);
    const roomSnap = await getDoc(roomRef);

    if (roomSnap.exists()) {
        return roomSnap.data() as Room;
    }
    
    return null;
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
      const newTimeSlots = [...roomData.timeSlots];
      const hasVoted = timeSlot.voters?.includes(userId);

      if (hasVoted) {
        // User has already voted, so un-vote
        newTimeSlots[timeSlotIndex] = {
          ...timeSlot,
          selections: timeSlot.selections - 1,
          voters: timeSlot.voters.filter(voterId => voterId !== userId)
        };
      } else {
        // User has not voted, so add vote
        newTimeSlots[timeSlotIndex] = {
          ...timeSlot,
          selections: timeSlot.selections + 1,
          voters: [...(timeSlot.voters || []), userId]
        };
      }

      transaction.update(roomRef, { timeSlots: newTimeSlots });
    });

    revalidatePath(`/${pin}`);
    return { success: true, voted: !hasVoted };
  } catch (e) {
    console.error("Transaction failed: ", e);
    return { success: false, message: 'An error occurred while voting.' };
  }
}
