'use client';

import { Sidebar } from './sidebar';
import { useUIStore } from '@/store';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { sidebarOpen } = useUIStore();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main
        className={cn(
          'min-h-screen transition-all duration-300',
          sidebarOpen ? 'ml-64' : 'ml-16'
        )}
      >
        {children}
      </main>
    </div>
  );
}
