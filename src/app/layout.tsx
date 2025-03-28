import './globals.css';
import { Inter } from 'next/font/google';
import Sidebar from '../components/Sidebar';
import ErrorBoundary from '../components/ErrorBoundary'; // Change from { ErrorBoundary } to default import

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
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex">
          <Sidebar />
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