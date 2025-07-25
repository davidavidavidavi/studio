
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getRoom } from '../actions';
import TimeSlotCard from '@/components/time-slot-card';
import { Badge } from '@/components/ui/badge';
import { Users, HandMetal, Calendar as CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';

export async function generateMetadata({ params }: { params: { pin: string } }): Promise<Metadata> {
  return {
    title: `Room ${params.pin.toUpperCase()} - FreakMeet`,
    description: `Vote for the best meeting time in room ${params.pin.toUpperCase()}.`,
  };
}

// A helper to calculate duration between time slots
function calculateDuration(timeSlots: { time: string }[]): number {
  if (timeSlots.length < 2) {
    return 30; // Default duration
  }
  const first = new Date(timeSlots[0].time).getTime();
  const second = new Date(timeSlots[1].time).getTime();
  return (second - first) / 60000; // duration in minutes
}

export default async function RoomPage({ params }: { params: { pin: string } }) {
  const pin = params.pin.toUpperCase();
  const room = await getRoom(pin);

  if (!room) {
    notFound();
  }
  
  const totalSelections = room.timeSlots.reduce((sum, slot) => sum + slot.selections, 0);
  const duration = calculateDuration(room.timeSlots);
  
  // The date is stored as 'YYYY-MM-DD'. To avoid timezone issues when parsing,
  // we explicitly treat it as a UTC date by appending 'T00:00:00Z'.
  const roomDate = parseISO(`${room.date}T00:00:00Z`);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2" aria-label="Back to Home">
            <HandMetal className="h-8 w-8 text-primary" />
            <h1 className="hidden text-2xl font-bold tracking-tighter sm:block sm:text-3xl font-headline">
              FreakMeet
            </h1>
          </Link>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-lg font-mono tracking-widest">
              {room.pin}
            </Badge>
            <div className="flex items-center gap-2 text-muted-foreground" title={`${totalSelections} total votes`}>
               <Users className="h-5 w-5" />
               <span className="text-lg font-semibold">{totalSelections}</span>
               <span className="hidden sm:inline">votes</span>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-6">
        <div className="mb-8 text-center">
            <div className="mb-2 flex items-center justify-center gap-2 text-xl text-muted-foreground">
              <CalendarIcon className="h-5 w-5" />
              <time dateTime={room.date}>{format(roomDate, 'PPP')}</time>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl font-headline">Select Your Time</h2>
            <p className="mt-2 text-muted-foreground">Click a slot to cast your vote. Popular times get hotter!</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {room.timeSlots.map((slot) => (
            <TimeSlotCard
              key={slot.id}
              pin={room.pin}
              timeSlot={slot}
              duration={duration}
            />
          ))}
        </div>
      </main>
      <footer className="mt-12 py-6 text-center text-muted-foreground text-sm">
        <p>Share this room with your friends! PIN: <strong className="font-mono">{room.pin}</strong></p>
      </footer>
    </div>
  );
}
