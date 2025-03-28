'use client';

import './globals.css';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { ErrorBoundary } from '../components/ErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'LG Operations',
  description: 'Project management for LG Asphalt team',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex">
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
          <div className="main-content">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </div>
      </body>
    </html>
  );
}