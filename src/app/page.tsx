'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login attempted"); // Replaced password logging with generic message
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      console.error("Login error:", error.message);
    } else {
      console.log("Login response:", JSON.stringify(data, null, 2));
      document.cookie = `sb-access-token=${data.session.access_token}; path=/; SameSite=Lax; Secure`;
      document.cookie = `sb-refresh-token=${data.session.refresh_token}; path=/; SameSite=Lax; Secure`;
      console.log("Cookies set manually");
      console.log("Login successful, redirecting...");
      try {
        await router.push('/dashboard');
        console.log("Redirect completed");
      } catch (err) {
        console.error("Redirect failed:", err);
      }
    }
  };

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-4">Login to LG Operations</h1>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 rounded bg-gray-700 text-white"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 rounded bg-gray-700 text-white"
              required
            />
          </div>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <button type="submit" className="btn-yellow w-full">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}