import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/play', label: 'Play' },
  { to: '/discover', label: 'Discover' },
  { to: '/practice', label: 'Practice' },
  { to: '/create', label: 'Create' },
];

export function AppShell({ title, subtitle, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 dark:from-purple-950 dark:via-pink-950 dark:to-blue-950">
      <header className="border-b border-black/10 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-black/20">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-sm transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background/70 text-muted-foreground hover:bg-background hover:text-foreground'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
