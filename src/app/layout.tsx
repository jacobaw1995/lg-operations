import './globals.css';
import ErrorBoundary from '../components/ErrorBoundary';
import ClientLayout from './ClientLayout'; // Should resolve to src/app/ClientLayout.tsx

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
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}