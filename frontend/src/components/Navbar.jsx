import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Target, Users, Settings, CheckSquare, LogOut, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

export default function Navbar() {
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
    { path: '/admin', label: 'Admin Portal', icon: <Settings size={18} /> },
  ];

  const navLinks =
    user?.role === 'admin' ? adminLinks :
      user?.role === 'teacher' ? teacherLinks :
        user?.role === 'ambassador' ? ambassadorLinks :
          [];

  const publicPaths = ['/login', '/apply', '/teacher-apply'];
  const isPublicPage = publicPaths.includes(location.pathname) || location.pathname.startsWith('/invite');

  return (
    <nav className="bg-surface border-b border-primary-90 py-sm px-md flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center space-x-md">
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
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full text-label-md transition-colors ${isActive(link.path)
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
  );
}