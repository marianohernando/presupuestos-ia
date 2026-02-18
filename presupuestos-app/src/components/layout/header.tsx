'use client';

import { useUIStore } from '@/store';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function Header({ title, description, actions }: HeaderProps) {
  const { sidebarOpen } = useUIStore();

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        sidebarOpen ? 'ml-64' : 'ml-16'
      )}
    >
      <div className="flex flex-col">
        {title && (
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        )}
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
