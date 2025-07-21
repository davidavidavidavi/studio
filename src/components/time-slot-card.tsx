'use client';

import { useTransition } from 'react';
import { selectTimeSlot } from '@/app/actions';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Users, Clock, Loader2 } from 'lucide-react';
import type { TimeSlot } from '@/app/actions';

interface TimeSlotCardProps {
  pin: string;
  timeSlot: TimeSlot;
}

export default function TimeSlotCard({ pin, timeSlot }: TimeSlotCardProps) {
  const [isPending, startTransition] = useTransition();

  const handleSelect = () => {
    startTransition(() => {
      selectTimeSlot(pin, timeSlot.id);
    });
  };

  const getCardColor = (selections: number) => {
    if (selections === 0) return 'bg-card/80 hover:bg-card';
    if (selections <= 2) return 'bg-accent/30 hover:bg-accent/40';
    if (selections <= 5) return 'bg-accent/60 hover:bg-accent/70';
    if (selections <= 9) return 'bg-primary/70 hover:bg-primary/80';
    return 'bg-primary hover:bg-primary/90';
  };
  
  const getTextColor = (selections: number) => {
    if (selections > 5) return 'text-primary-foreground';
    return 'text-card-foreground';
  }

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-105 shadow-md hover:shadow-xl',
        getCardColor(timeSlot.selections),
        isPending && 'cursor-not-allowed opacity-70 scale-100'
      )}
      onClick={!isPending ? handleSelect : undefined}
      aria-disabled={isPending}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if((e.key === 'Enter' || e.key === ' ') && !isPending) {
          e.preventDefault();
          handleSelect();
        }
      }}
    >
      <CardContent className={cn('flex flex-col items-center justify-center p-6 space-y-3', getTextColor(timeSlot.selections))}>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          <p className="text-lg font-semibold text-center">{timeSlot.time}</p>
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
