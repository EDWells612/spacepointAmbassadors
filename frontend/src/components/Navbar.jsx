import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Target, Users, Settings, CheckSquare, LogOut, BookOpen, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isActive = (path) => location.pathname === path;

  // Nav links per role
  const ambassadorLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { path: '/leads', label: 'Leads', icon: <Target size={18} /> },
    { path: '/tasks', label: 'Tasks', icon: <CheckSquare size={18} /> },
    { path: '/network', label: 'Network', icon: <Users size={18} /> },
  ];

  const teacherLinks = [
    { path: '/teacher', label: 'My Sessions', icon: <BookOpen size={18} /> },
    { path: '/tasks', label: 'Tasks', icon: <CheckSquare size={18} /> },
  ];

  const adminLinks = [
    { path: '/admin', label: 'Ambassadors', icon: <Users size={18} />, state: { tab: 'ambassadors' } },
    { path: '/admin', label: 'Leads', icon: <Target size={18} />, state: { tab: 'leads' } },
    { path: '/admin', label: 'Tasks', icon: <CheckSquare size={18} />, state: { tab: 'tasks' } },
    { path: '/admin', label: 'Orders', icon: <Package size={18} />, state: { tab: 'orders' } },
    { path: '/admin', label: 'Swag', icon: <Gift size={18} />, state: { tab: 'swag' } },
  ];

  const navLinks =
    user?.role === 'admin' ? adminLinks :
      user?.role === 'teacher' ? teacherLinks :
        user?.role === 'ambassador' ? ambassadorLinks :
          [];

  const publicPaths = ['/login', '/apply', '/teacher-apply'];
  const isPublicPage = publicPaths.includes(location.pathname) || location.pathname.startsWith('/invite');

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <>
      <nav className="bg-surface border-b border-primary-90 py-sm px-md flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-md">
          {user && !isPublicPage && (
            <button
              onClick={toggleMenu}
              className="md:hidden text-on-surface p-1 hover:bg-primary-90 rounded-md transition-colors"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          )}
          
          <Link to="/" className="flex items-center space-x-2">
            <img
              src="/SpacePoint_20logo.png"
              alt="SpacePoint"
              className="h-8 object-contain"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
            />
            <div className="hidden text-headline-sm text-on-surface font-outfit font-bold">SpacePoint</div>
          </Link>

          {user && !isPublicPage && (
            <div className="hidden md:flex space-x-2">
              {navLinks.map((link, idx) => (
                <Link
                  key={`${link.path}-${idx}`}
                  to={link.path}
                  state={link.state}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full text-label-md transition-colors ${isActive(link.path) && (!link.state || location.state?.tab === link.state.tab)
                      ? 'bg-primary-90 text-on-surface'
                      : 'text-secondary hover:bg-tertiary hover:text-on-surface'
                    }`}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-sm">
          {user ? (
            <div className="flex items-center space-x-sm">
              <NotificationBell />
              <div className="hidden md:flex flex-col items-end">
                <span className="text-label-sm text-on-surface">{user.name}</span>
                <span className="text-label-sm text-secondary capitalize">{user.role}</span>
              </div>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="bg-surface hover:bg-primary-90 border border-primary-90 text-on-surface text-label-sm px-4 py-2 rounded-full transition-colors flex items-center space-x-2"
              >
                <LogOut size={16} />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="bg-primary hover:bg-primary-60 text-on-surface text-label-sm px-6 py-2 rounded-full font-semibold transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-neutral/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Mobile Side Menu */}
      <div className={`fixed top-[64px] left-0 bottom-0 w-64 bg-surface border-r border-primary-90 z-40 md:hidden transform transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col p-md space-y-2">
          <div className="pb-sm border-b border-primary-90 mb-sm">
            <div className="text-label-md text-on-surface font-bold">{user?.name}</div>
            <div className="text-label-sm text-secondary capitalize">{user?.role}</div>
          </div>
          
          {navLinks.map((link, idx) => (
            <Link
              key={`${link.path}-${idx}`}
              to={link.path}
              state={link.state}
              onClick={() => setIsMenuOpen(false)}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-label-md transition-colors ${isActive(link.path) && (!link.state || location.state?.tab === link.state.tab)
                  ? 'bg-primary-90 text-on-surface shadow-sm'
                  : 'text-secondary hover:bg-tertiary hover:text-on-surface'
                }`}
            >
              <span className={isActive(link.path) && (!link.state || location.state?.tab === link.state.tab) ? 'text-on-surface' : 'text-primary-60'}>
                {link.icon}
              </span>
              <span>{link.label}</span>
            </Link>
          ))}
          
          <div className="pt-lg mt-auto">
            <button
              onClick={() => { logout(); navigate('/login'); setIsMenuOpen(false); }}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-label-md text-error hover:bg-error/10 transition-colors"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}