'use client';
import { Geist } from 'next/font/google';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from './utils/supabase';
import './globals.css';

const geist = Geist({ subsets: ['latin'] });
const supabase = createClient();

function HQDropdown({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="text-green-400 hover:text-green-300 text-sm font-semibold transition px-3 py-2 rounded-xl hover:bg-gray-800 flex items-center gap-1"
      >
        HQ Manager {open ? '▴' : '▾'}
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 bg-gray-900 border border-gray-800 rounded-xl shadow-xl z-50 min-w-48">
          {links.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`block px-4 py-2.5 text-sm hover:bg-gray-800 transition ${
                pathname === link.href ? 'text-green-400' : 'text-gray-400 hover:text-white'
              } ${i === 0 ? 'rounded-t-xl' : ''} ${i === links.length - 1 ? 'rounded-b-xl' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);

  const isLoginPage = pathname === '/login';
  const isAdminPage = pathname === '/admin';
  const isResetPage = pathname === '/reset-password';
  const isVerifiedPage = pathname === '/verified';

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        setLoading(false);
        if (!isLoginPage) router.push('/login');
        return;
      }

      setEmail(session.user.email || '');

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('email', session.user.email)
        .single();

      setRole(data?.role || 'worker');
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        setEmail('');
        setRole('');
        if (!isLoginPage) router.push('/login');
        return;
      }
      setEmail(session.user.email || '');

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('email', session.user.email)
        .single();

      setRole(data?.role || 'worker');
    });

    return () => subscription.unsubscribe();
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading && !isLoginPage) {
    return (
      <html lang="en">
        <body className={geist.className}>
          <div className="min-h-screen bg-gray-950 flex items-center justify-center">
            <p className="text-gray-500 text-sm">Loading...</p>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body className={geist.className}>
        {!isLoginPage && !isAdminPage && !isResetPage && !isVerifiedPage && email && (
          <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3">
            <div className="max-w-6xl mx-auto flex items-center justify-between">

              {/* Logo */}
              <Link href="/" className="flex items-center gap-2 shrink-0">
                <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center text-black font-bold text-sm">F</div>
                <span className="text-white font-bold text-sm">FieldMind</span>
              </Link>

              {/* Worker links — shown for workers in the middle */}
              {role !== 'hq_manager' && (
                <div className="flex items-center gap-1">
                  <Link href="/" className={`text-sm px-3 py-2 rounded-xl transition ${pathname === '/' ? 'text-white bg-gray-800' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                    Report Incident
                  </Link>
                  <Link href="/scan" className={`text-sm px-3 py-2 rounded-xl transition ${pathname === '/scan' ? 'text-white bg-gray-800' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                    Scan Equipment
                  </Link>
                  <Link href="/my-incidents" className={`text-sm px-3 py-2 rounded-xl transition ${pathname === '/my-incidents' ? 'text-white bg-gray-800' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                    My Incidents
                  </Link>
                  <Link href="/manual" className={`text-sm px-3 py-2 rounded-xl transition ${pathname === '/manual' ? 'text-white bg-gray-800' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                    Manual
                  </Link>
                  <Link href="/chat" className={`text-sm px-3 py-2 rounded-xl transition ${pathname === '/chat' ? 'text-white bg-gray-800' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                    AI Chat
                  </Link>
                  <Link href="/checkin" className={`text-sm px-3 py-2 rounded-xl transition ${pathname === '/checkin' ? 'text-white bg-gray-800' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                    Check In
                  </Link>
                  <Link href="/safety" className={`text-sm px-3 py-2 rounded-xl transition ${pathname === '/safety' ? 'text-white bg-gray-800' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                    Safety Score
                  </Link>
                </div>
              )}

              {/* Right side */}
              <div className="flex items-center gap-3">

                {/* HQ Manager worker links */}
                {role === 'hq_manager' && (
                  <div className="flex items-center gap-1">
                    <Link href="/" className={`text-sm px-3 py-2 rounded-xl transition ${pathname === '/' ? 'text-white bg-gray-800' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                      Report Incident
                    </Link>
                    <Link href="/my-incidents" className={`text-sm px-3 py-2 rounded-xl transition ${pathname === '/my-incidents' ? 'text-white bg-gray-800' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                      My Incidents
                    </Link>
                    <Link href="/manual" className={`text-sm px-3 py-2 rounded-xl transition ${pathname === '/manual' ? 'text-white bg-gray-800' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                      Manual
                    </Link>
                    <Link href="/chat" className={`text-sm px-3 py-2 rounded-xl transition ${pathname === '/chat' ? 'text-white bg-gray-800' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                      AI Chat
                    </Link>
                    <Link href="/checkin" className={`text-sm px-3 py-2 rounded-xl transition ${pathname === '/checkin' ? 'text-white bg-gray-800' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                      Check In
                    </Link>
                    <Link href="/safety" className={`text-sm px-3 py-2 rounded-xl transition ${pathname === '/safety' ? 'text-white bg-gray-800' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                      Safety Score
                    </Link>
                  </div>
                )}

                {/* HQ Manager dropdown */}
                {role === 'hq_manager' && (
                  <HQDropdown links={[
                    { href: '/dashboard', label: 'Dashboard' },
                    { href: '/workers', label: 'Workers' },
                    { href: '/map', label: 'Live Map' },
                    { href: '/analytics', label: 'Analytics' },
                    { href: '/predictions', label: 'Predictions' },
                    { href: '/reports', label: 'AI Reports' },
                    { href: '/logs', label: 'AI Logs' },
                    { href: '/equipment', label: 'Equipment Health' },
                    { href: '/demo', label: 'Live Demo' },
                  ]} />
                )}

                <Link href="/profile" className="text-xs text-gray-500 hover:text-white transition hidden sm:block">
                  {email}
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-xl transition"
                >
                  Log out
                </button>
              </div>

            </div>
          </nav>
        )}
        {children}
      </body>
    </html>
  );
}