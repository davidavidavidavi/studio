
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, setDoc, updateDoc, runTransaction, arrayUnion, arrayRemove, getDocs, deleteDoc } from 'firebase/firestore';

// Define types
export interface TimeSlot {
  id: string;
  time: string; // Stored as full ISO 8601 string, e.g., '2024-07-23T09:00:00.000Z'
  selections: number;
  voters: string[];
}

export interface Room {
  pin: string;
  date: string; // Stored as ISO 8601 string (date part only, e.g., '2024-07-23')
  timeSlots: TimeSlot[];
}

const roomsCollection = collection(db, 'rooms');

// Function to create time slots with full ISO strings
function createTimeSlots(timeStrings: string[], forDate: Date): TimeSlot[] {
    return timeStrings.map((time, index) => {
        const [hours, minutes] = time.split(':').map(Number);
        
        // Create a new date object for each slot based on the provided `forDate`
        const slotDate = new Date(forDate);
        slotDate.setHours(hours, minutes, 0, 0);

        return {
            id: `${index + 1}`,
            time: slotDate.toISOString(), // Store as full ISO string in UTC
            selections: 0,
            voters: [],
        };
    });
}

// Function to generate time strings based on a time range and duration
function generateTimeSlots(startTime: number, endTime: number, duration: number, forDate: Date): string[] {
    const slots: string[] = [];

    // Create a date object that we can mutate. This starts at the beginning of the selected day in the user's timezone.
    let current = new Date(forDate);
    current.setHours(startTime, 0, 0, 0);

    // Create an end marker.
    const endDate = new Date(forDate);
    endDate.setHours(endTime, 0, 0, 0);

    // If the end time is before the start time (e.g., 9pm to 2am), it spans across midnight.
    if (endDate <= current) {
      endDate.setDate(endDate.getDate() + 1);
    }

    while (current < endDate) {
        // Get hours and minutes from the `current` date object, which is in the user's timezone.
        const hours = current.getHours().toString().padStart(2, '0');
        const minutes = current.getMinutes().toString().padStart(2, '0');
        slots.push(`${hours}:${minutes}`);

        // Increment by the duration.
        current.setMinutes(current.getMinutes() + duration);
    }
    return slots;
}


export async function createRoom(pin: string, data?: { timeRange?: [number, number], duration?: number, timeStrings?: string[], date?: string }) {
  const upperCasePin = pin.toUpperCase();
  const roomRef = doc(roomsCollection, upperCasePin);

  let timeSlots: TimeSlot[];
  // The date string from the client is an ISO string. new Date() will parse it
  // and maintain the correct point in time, including timezone offset. This is critical.
  const roomDate = data?.date ? new Date(data.date) : new Date();

  if (data?.timeStrings && data.timeStrings.length > 0) {
    // This path is likely unused now but kept for safety.
    timeSlots = createTimeSlots(data.timeStrings, roomDate);
  } else if (data?.timeRange && data.duration) {
    const timeStrings = generateTimeSlots(data.timeRange[0], data.timeRange[1], data.duration, roomDate);
    // When creating time slots from generated strings, we must use the same roomDate
    // to ensure the timezone context is preserved.
    timeSlots = createTimeSlots(timeStrings, roomDate);
  } else {
    // Default room creation
    const timeStrings = generateTimeSlots(9, 17, 30, roomDate);
    timeSlots = createTimeSlots(timeStrings, roomDate);
  }

  // To store just the date part, we must format it according to the user's original timezone
  // to prevent the date from shifting. We extract Y/M/D from the original date object.
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

export async function clearAllRooms() {
  const snapshot = await getDocs(roomsCollection);
  const deletions = snapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
  await Promise.all(deletions);
  revalidatePath('/');
  return { success: true };
}
