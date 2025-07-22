
'use client'

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from "date-fns"
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createRoom } from './actions';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const pinFormSchema = z.object({
  pin: z.string().length(4, "PIN must be 4 characters.").regex(/^[a-zA-Z0-9]{4}$/, "PIN must be alphanumeric."),
});

const timeSlotsSchema = z.object({
  date: z.date(),
  timeRange: z.array(z.number()).length(2),
  duration: z.number().min(5, "Duration must be at least 5 minutes.").max(120, "Duration can be at most 120 minutes."),
});

function generatePin(): string {
  let pin;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
  pin = '';
  for (let i = 0; i < 4; i++) {
      pin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pin;
}

export default function JoinRoomForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const pinForm = useForm<z.infer<typeof pinFormSchema>>({
    resolver: zodResolver(pinFormSchema),
    defaultValues: {
      pin: "",
    },
  });
  
  const timeSlotsForm = useForm<z.infer<typeof timeSlotsSchema>>({
    resolver: zodResolver(timeSlotsSchema),
    defaultValues: {
      date: new Date(),
      timeRange: [9, 17], // 9 AM to 5 PM
      duration: 30,
    },
  });

  function onPinSubmit(values: z.infer<typeof pinFormSchema>) {
    router.push(`/${values.pin.toUpperCase()}`);
  }

  function onTimeSlotsSubmit(values: z.infer<typeof timeSlotsSchema>) {
    startTransition(async () => {
      const pin = generatePin();
      const newPin = await createRoom(pin, {
        ...values,
        date: values.date.toISOString(),
      });
      router.push(`/${newPin}`);
    });
  }
  
  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };
  
  const handleCreateDefaultRoom = () => {
    startTransition(async () => {
      const pin = generatePin();
      const newPin = await createRoom(pin);
      router.push(`/${newPin}`);
    });
  }
  
  const timeRange = timeSlotsForm.watch('timeRange');

  return (
    <>
      <div className="space-y-6">
        <div className="flex gap-2">
          <Button
            onClick={handleCreateDefaultRoom}
            disabled={isPending}
            className="w-full text-lg"
            size="lg"
          >
            {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            Create a New Room
          </Button>
          <Button
            onClick={handleOpenDialog}
            disabled={isPending}
            className="text-lg"
            size="lg"
            variant="outline"
          >
            ...
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Separator className="flex-1" />
          <span className="text-sm text-muted-foreground">OR</span>
          <Separator className="flex-1" />
        </div>

        <Form {...pinForm}>
          <form onSubmit={pinForm.handleSubmit(onPinSubmit)} className="space-y-4">
            <FormField
              control={pinForm.control}
              name="pin"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input 
                      placeholder="ENTER PIN" 
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      className="text-center text-lg tracking-[0.5em]"
                      maxLength={4} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" variant="secondary" className="w-full">
              Join with PIN
            </Button>
          </form>
        </Form>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Time Slots</DialogTitle>
            <DialogDescription>
              Select a date, set the time range with the slider, and specify the duration for each meeting slot.
            </DialogDescription>
          </DialogHeader>
          <Form {...timeSlotsForm}>
            <form onSubmit={timeSlotsForm.handleSubmit(onTimeSlotsSubmit)} className="space-y-6">
              <FormField
                control={timeSlotsForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={timeSlotsForm.control}
                name="timeRange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Range (local time)</FormLabel>
                    <FormControl>
                      <Slider
                        value={field.value}
                        onValueChange={field.onChange}
                        min={0}
                        max={24}
                        step={1}
                      />
                    </FormControl>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{field.value[0]}:00</span>
                      <span>{field.value[1]}:00</span>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={timeSlotsForm.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slot Duration (minutes)</FormLabel>
                    <FormControl>
                       <Input 
                          type="number"
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}
                          min="5"
                          max="120"
                       />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
                />
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                  Create Room
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
