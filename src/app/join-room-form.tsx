'use client'

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createRoom } from './actions';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const formSchema = z.object({
  pin: z.string().length(4, "PIN must be 4 characters.").regex(/^[a-zA-Z0-9]{4}$/, "PIN must be alphanumeric."),
});

const timeSlotsSchema = z.object({
  timeSlots: z.string().min(1, 'Please provide at least one time slot.'),
});

export default function JoinRoomForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const pinForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pin: "",
    },
  });
  
  const timeSlotsForm = useForm<z.infer<typeof timeSlotsSchema>>({
    resolver: zodResolver(timeSlotsSchema),
    defaultValues: {
      timeSlots: "9:00 - 9:30 AM\n9:30 - 10:00 AM\n10:00 - 10:30 AM\n10:30 - 11:00 AM\n11:00 - 11:30 AM\n11:30 - 12:00 PM\n1:00 - 1:30 PM\n1:30 - 2:00 PM\n2:00 - 2:30 PM\n2:30 - 3:00 PM\n3:00 - 3:30 PM\n3:30 - 4:00 PM",
    },
  });

  function onPinSubmit(values: z.infer<typeof formSchema>) {
    router.push(`/${values.pin.toUpperCase()}`);
  }

  function onTimeSlotsSubmit(values: z.infer<typeof timeSlotsSchema>) {
    startTransition(async () => {
      const timeSlots = values.timeSlots.split('\n').filter(ts => ts.trim() !== '');
      await createRoom(timeSlots);
    });
  }
  
  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };
  
  const handleCreateDefaultRoom = () => {
    startTransition(async () => {
      await createRoom();
    });
  }

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
              Enter the time slots you want to make available for voting, one per line.
            </DialogDescription>
          </DialogHeader>
          <Form {...timeSlotsForm}>
            <form onSubmit={timeSlotsForm.handleSubmit(onTimeSlotsSubmit)} className="space-y-4">
              <FormField
                control={timeSlotsForm.control}
                name="timeSlots"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="time-slots">Available Times</Label>
                    <FormControl>
                      <Textarea
                        id="time-slots"
                        rows={12}
                        placeholder="e.g. 9:00 - 10:00 AM"
                        {...field}
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
