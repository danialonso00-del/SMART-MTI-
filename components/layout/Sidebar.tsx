'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  Target,
  FolderOpen,
  Receipt,
  BookOpen,
  Users,
  Building2,
  Upload,
  Plug,
  Settings,
  X,
  ChevronRight,
  LogOut,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Países', href: '/geo', icon: Globe },
  { label: 'Pipeline', href: '/pipeline', icon: TrendingUp },
  { label: 'Oportunidades', href: '/opportunities', icon: Target },
  { label: 'Proyectos', href: '/projects', icon: FolderOpen },
  { label: 'Servicios', href: '/services', icon: Building2 },
  { label: 'Facturación', href: '/billing', icon: Receipt },
  { label: 'Contabilidad', href: '/accounting', icon: BookOpen },
  { label: 'Clientes', href: '/clients', icon: Users },
  { label: 'Importar Excel', href: '/import', icon: Upload },
  { label: 'Integraciones', href: '/integrations', icon: Plug },
  { label: 'Configuración', href: '/settings', icon: Settings },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 bg-slate-900 flex flex-col z-50 transition-transform duration-300',
          'lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-amber-500/25">
              M
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-tight">MTI Group</div>
              <div className="text-slate-400 text-xs">Mingothings</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-3 mb-3">
            Principal
          </p>

          {navItems.slice(0, 8).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
                  isActive
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                )}
              >
                <Icon
                  size={18}
                  className={cn(
                    'shrink-0 transition-colors',
                    isActive ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300'
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <ChevronRight size={14} className="text-amber-400/60" />
                )}
              </Link>
            );
          })}

          <div className="pt-4">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-3 mb-3">
              Sistema
            </p>
            {navItems.slice(8).map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
                    isActive
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  )}
                >
                  <Icon
                    size={18}
                    className={cn(
                      'shrink-0 transition-colors',
                      isActive ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300'
                    )}
                  />
                  <span className="flex-1">{item.label}</span>
                  {isActive && (
                    <ChevronRight size={14} className="text-amber-400/60" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User info + logout */}
        <div className="px-4 py-4 border-t border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              DA
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-medium truncate">Dani Alonso</div>
              <div className="text-slate-500 text-xs truncate">Admin</div>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-slate-800"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {/* Version */}
        <div className="px-4 pb-3">
          <div className="text-slate-600 text-xs text-center">v1.0.0 · 2026</div>
        </div>
      </aside>
    </>
  );
}
