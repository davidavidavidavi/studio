
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
        
        // Create a new Date object for each slot based on the local date parts,
        // then set the local hours and minutes.
        const date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);

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

    // Create start and end dates in local time based on the provided date and hours
    const startDate = new Date(forDate.getFullYear(), forDate.getMonth(), forDate.getDate(), startTime);

    const endDate = new Date(forDate.getFullYear(), forDate.getMonth(), forDate.getDate(), endTime);

    let current = new Date(startDate);

    while (current.getTime() < endDate.getTime()) {
        // Format the time in HH:mm format based on local time
        const hours = current.getHours().toString().padStart(2, '0');
        const minutes = current.getMinutes().toString().padStart(2, '0');
        slots.push(`${hours}:${minutes}`);
        
        // Increment current time by the duration
        current = new Date(current.getTime() + duration * 60000);
    }
    return slots;
}

export async function createRoom(pin: string, data?: { timeRange?: [number, number], duration?: number, timeStrings?: string[], date?: string }) {
  const upperCasePin = pin.toUpperCase();
  const roomRef = doc(roomsCollection, upperCasePin);
  
  let timeSlots: TimeSlot[];
  // The date string from the client is an ISO string. new Date() will parse it
  // and maintain the correct point in time, including timezone offset.
  const roomDate = data?.date ? new Date(data.date) : new Date();

  // We no longer create a "clean" date object here, as it was causing timezone issues.
  // Instead, we pass the original `roomDate` object, which has the correct timezone info from the client.

  if (data?.timeStrings && data.timeStrings.length > 0) {
    // This path is for default room creation.
    timeSlots = createTimeSlots(data.timeStrings, roomDate);
  } else if (data?.timeRange && data.duration) {
    const timeStrings = generateTimeSlots(data.timeRange[0], data.timeRange[1], data.duration, roomDate);
    timeSlots = createTimeSlots(timeStrings, roomDate);
  } else {
    // Default room creation
    timeSlots = createTimeSlots(defaultTimeStrings, roomDate);
  }
  
  // To store the date part, we format it based on the client's original date object.
  // We need to construct the YYYY-MM-DD string manually to avoid timezone shifts.
  const year = roomDate.getFullYear();
  const month = (roomDate.getMonth() + 1).toString().padStart(2, '0');
  const day = roomDate.getDate().toString().padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;

  const newRoom: Room = {
    pin: upperCasePin,
    date: dateString, // Store just the date part, e.g., '2024-07-25'
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
    let hasVoted: boolean | undefined = undefined;

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

      const newTimeSlots = [...roomData.timeSlots];
      const timeSlot = newTimeSlots[timeSlotIndex];
      
      const userHasVotedForSlot = timeSlot.voters?.includes(userId);
      hasVoted = !userHasVotedForSlot; // This will be the new voted state

      if (userHasVotedForSlot) {
        // User has already voted, so un-vote
        timeSlot.selections = Math.max(0, timeSlot.selections - 1);
        timeSlot.voters = timeSlot.voters.filter(voterId => voterId !== userId);
      } else {
        // User has not voted, so add vote
        timeSlot.selections = timeSlot.selections + 1;
        timeSlot.voters = [...(timeSlot.voters || []), userId];
      }

      transaction.update(roomRef, { timeSlots: newTimeSlots });
    });

    revalidatePath(`/${pin}`);
    return { success: true, voted: hasVoted };
  } catch (e) {
    console.error("Transaction failed: ", e);
    return { success: false, message: 'An error occurred while voting.' };
  }
}
