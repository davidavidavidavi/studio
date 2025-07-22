import { HandMetal } from 'lucide-react';
import JoinRoomForm from './join-room-form';

export default function Home() {
  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
        <div className="w-full max-w-md space-y-8 text-center">
          <div>
            <HandMetal className="mx-auto h-16 w-16 text-primary" />
            <h1 className="mt-6 font-headline text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Welcome to FreakMeet
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Coordinate your crew's availability with zero friction. Create a room or join one to get started.
            </p>
          </div>
          <JoinRoomForm />
        </div>
      </main>
      <div className="w-full flex justify-center mt-8 pb-8">
        <a href="/admin">
          <button className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-bold text-lg shadow hover:bg-primary/90 transition-colors">
            Admin
          </button>
        </a>
      </div>
    </>
  );
}
