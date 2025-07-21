'use client'

import { useTransition } from 'react';
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

const formSchema = z.object({
  pin: z.string().length(4, "PIN must be 4 characters.").regex(/^[a-zA-Z0-9]{4}$/, "PIN must be alphanumeric."),
});

export default function JoinRoomForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pin: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    router.push(`/${values.pin.toUpperCase()}`);
  }

  const handleCreateRoom = () => {
    startTransition(async () => {
      await createRoom();
    });
  };

  return (
    <div className="space-y-6">
      <Button
        onClick={handleCreateRoom}
        disabled={isPending}
        className="w-full text-lg"
        size="lg"
      >
        {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
        Create a New Room
      </Button>

      <div className="flex items-center space-x-2">
        <Separator className="flex-1" />
        <span className="text-sm text-muted-foreground">OR</span>
        <Separator className="flex-1" />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
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
  );
}
