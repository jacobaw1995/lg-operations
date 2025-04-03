'use client';

import './globals.css';
import Sidebar from '../components/Sidebar';
import ErrorBoundary from '../components/ErrorBoundary';
import { usePathname } from 'next/navigation';

export const metadata = {
  title: 'LG Operations',
  description: 'Project management for LG Asphalt team',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  console.log('Current pathname:', pathname); // Debugging log

  return (
    <html lang="en">
      <body>
        <div className="flex">
          {pathname !== '/' && <Sidebar />}
          <div className={pathname === '/' ? 'w-full' : 'main-content'}>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </div>
      </body>
    </html>
  );
}