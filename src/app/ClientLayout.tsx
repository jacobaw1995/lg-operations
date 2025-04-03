'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import ErrorBoundary from '../components/ErrorBoundary';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  console.log('Current pathname:', pathname); // Debugging log

  return (
    <div className="flex">
      {pathname !== '/' && <Sidebar />}
      <div className={pathname === '/' ? 'w-full' : 'main-content'}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </div>
    </div>
  );
}