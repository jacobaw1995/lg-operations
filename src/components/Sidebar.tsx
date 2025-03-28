'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

export default function Sidebar() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="sidebar">
      <h1 className="text-2xl font-bold mb-8">LG Operations</h1>
      <nav>
        <ul>
          <li className="mb-4">
            <Link href="/dashboard" className="text-white hover:text-yellow-500">
              Dashboard
            </Link>
          </li>
          <li className="mb-4">
            <Link href="/crm" className="text-white hover:text-yellow-500">
              CRM
            </Link>
          </li>
          <li className="mb-4">
            <Link href="/estimates" className="text-white hover:text-yellow-500">
              Estimates
            </Link>
          </li>
          <li className="mb-4">
            <Link href="/projects" className="text-white hover:text-yellow-500">
              Projects
            </Link>
          </li>
          <li className="mb-4">
            <button
              onClick={handleLogout}
              className="text-white hover:text-yellow-500"
            >
              Logout
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}