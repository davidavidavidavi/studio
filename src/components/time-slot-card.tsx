
'use client';

import { useState, useEffect, useTransition } from 'react';
import { selectTimeSlot } from '@/app/actions';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Users, Clock, Loader2, CheckCircle } from 'lucide-react';
import type { TimeSlot } from '@/app/actions';

interface TimeSlotCardProps {
  pin: string;
  timeSlot: TimeSlot;
  duration: number; // Duration of the slot in minutes
}

// A simple way to get a unique-ish ID for the user
function getUserId() {
  let userId = localStorage.getItem('freakmeet-userId');
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem('freakmeet-userId', userId);
  }
  return userId;
}

export default function TimeSlotCard({ pin, timeSlot, duration }: TimeSlotCardProps) {
  const [isPending, startTransition] = useTransition();
  const [hasVoted, setHasVoted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [displayTime, setDisplayTime] = useState('');
  const [userId, setUserId] = useState('');


  useEffect(() => {
    const currentUserId = getUserId();
    setUserId(currentUserId);
    
    if (timeSlot.voters?.includes(currentUserId)) {
      setHasVoted(true);
    }
    
    // Format time on client-side to use local timezone
    const startTime = new Date(timeSlot.time);
    const endTime = new Date(startTime.getTime() + duration * 60000);
    
    const options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
    const formattedStartTime = startTime.toLocaleTimeString([], options);
    const formattedEndTime = endTime.toLocaleTimeString([], options);
    
    setDisplayTime(`${formattedStartTime} - ${formattedEndTime}`);
    
    setIsLoading(false);
  }, [pin, timeSlot.id, timeSlot.time, timeSlot.voters, duration]);


  const handleSelect = () => {
    if (hasVoted || isPending || isLoading) return;

    startTransition(async () => {
      const result = await selectTimeSlot(pin, timeSlot.id, userId);
      if (result.success) {
        setHasVoted(true); // Visually update immediately
      }
    });
  };

  const getCardColor = (selections: number, voted: boolean) => {
    if (voted) return 'bg-secondary/70';
    if (selections === 0) return 'bg-card/80 hover:bg-card';
    if (selections <= 2) return 'bg-accent/30 hover:bg-accent/40';
    if (selections <= 5) return 'bg-accent/60 hover:bg-accent/70';
    if (selections <= 9) return 'bg-primary/70 hover:bg-primary/80';
    return 'bg-primary hover:bg-primary/90';
  };
  
  const getTextColor = (selections: number, voted: boolean) => {
    if (voted) return 'text-secondary-foreground';
    if (selections > 5) return 'text-primary-foreground';
    return 'text-card-foreground';
  }

  const isDisabled = hasVoted || isPending || isLoading;

  return (
    <Card
      className={cn(
        'transition-all duration-300 ease-in-out shadow-md',
        getCardColor(timeSlot.selections, hasVoted),
        isDisabled ? 'cursor-not-allowed opacity-80' : 'cursor-pointer transform hover:scale-105 hover:shadow-xl'
      )}
      onClick={handleSelect}
      aria-disabled={isDisabled}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      onKeyDown={(e) => {
        if((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
          e.preventDefault();
          handleSelect();
        }
      }}
    >
      <CardContent className={cn('flex flex-col items-center justify-center p-6 space-y-3', getTextColor(timeSlot.selections, hasVoted))}>
        <div className="flex items-center gap-2">
          {hasVoted ? <CheckCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
          <p className="text-lg font-semibold text-center">{isLoading ? 'Loading...' : displayTime}</p>
        </div>
        <div className="flex items-center gap-2 font-medium text-sm">
          {isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Users className="h-5 w-5" />
              <span>{timeSlot.selections} {timeSlot.selections === 1 ? 'vote' : 'votes'}</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
