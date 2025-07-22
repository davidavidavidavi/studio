"use client";
import { useState } from "react";
import { clearAllRooms } from "../actions";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (password !== "never_meet_a_freak_67") {
      setStatus("Incorrect password.");
      return;
    }
    setLoading(true);
    try {
      const result = await clearAllRooms();
      if (result.success) {
        setStatus("All rooms cleared!");
      } else {
        setStatus("Failed to clear rooms.");
      }
    } catch (err) {
      setStatus("Error clearing rooms.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-3xl font-bold mb-4">Admin Panel</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Enter admin password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-md text-lg"
            disabled={loading}
          />
          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md font-bold text-lg shadow hover:bg-primary/90 transition-colors"
            disabled={loading}
          >
            {loading ? "Clearing..." : "Clear All Rooms"}
          </button>
        </form>
        {status && <div className="mt-4 text-lg font-semibold">{status}</div>}
      </div>
    </div>
  );
} 