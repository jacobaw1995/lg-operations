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
      <h2 className="text-2xl font-bold mb-4">LG Operations</h2>
      <nav>
        <ul>
          <li className="mb-2">
            <Link href="/dashboard" className="text-yellow-500 hover:underline">
              Dashboard
            </Link>
          </li>
          <li className="mb-2">
            <Link href="/crm" className="text-yellow-500 hover:underline">
              CRM
            </Link>
          </li>
          <li className="mb-2">
            <Link href="/estimates" className="text-yellow-500 hover:underline">
              Estimates
            </Link>
          </li>
          <li className="mb-2">
            <Link href="/projects" className="text-yellow-500 hover:underline">
              Projects
            </Link>
          </li>
          <li className="mb-2">
            <Link href="/work-orders" className="text-yellow-500 hover:underline">
              Work Orders
            </Link>
          </li>
          <li className="mb-2">
            <Link href="/contractors" className="text-yellow-500 hover:underline">
              Contractors
            </Link>
          </li>
          <li className="mb-2">
            <Link href="/vendors" className="text-yellow-500 hover:underline">
              Vendors
            </Link>
          </li>
          <li className="mb-2">
            <button onClick={handleLogout} className="text-yellow-500 hover:underline">
              Logout
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}