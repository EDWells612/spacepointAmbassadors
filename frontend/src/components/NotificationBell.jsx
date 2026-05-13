import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Bell, CheckCircle, Target, BookOpen, User, Trophy, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:8000/api';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();

    // Refresh every 60 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
      if (isOpen) fetchNotifications();
    }, 60000);

    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API_URL}/notifications/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      });
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await axios.get(`${API_URL}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      });
      setUnreadCount(res.data.count);
    } catch (err) {
      console.error('Failed to fetch unread count', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await axios.put(`${API_URL}/notifications/${notif.id}/read`, {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
        });
        fetchUnreadCount();
      } catch (err) {
        console.error('Failed to mark notification as read', err);
      }
    }

    setIsOpen(false);
    
    // Navigate based on type and role
    const isAdmin = user?.role === 'admin';
    let type = notif.type;
    
    // Fallback for old notifications
    if (type === 'system' && notif.title.includes('Redemption')) {
        type = 'redemption';
    }

    switch (type) {
      case 'task': 
        isAdmin ? navigate('/admin', { state: { tab: 'tasks' } }) : navigate('/tasks'); 
        break;
      case 'lead': 
        isAdmin ? navigate('/admin', { state: { tab: 'leads' } }) : navigate('/leads'); 
        break;
      case 'session': 
        isAdmin ? navigate('/admin', { state: { tab: 'ambassadors' } }) : (user?.role === 'teacher' ? navigate('/teacher') : navigate('/network')); 
        break;
      case 'redemption':
        isAdmin ? navigate('/admin', { state: { tab: 'orders' } }) : navigate('/dashboard');
        break;
      case 'points': 
        isAdmin ? navigate('/admin', { state: { tab: 'points' } }) : navigate('/dashboard'); 
        break;
      case 'system': 
        isAdmin ? navigate('/admin', { state: { tab: 'ambassadors' } }) : navigate('/dashboard'); 
        break;
      default: break;
    }
  };

  const markAllRead = async () => {
    try {
      await axios.put(`${API_URL}/notifications/mark-all-read`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      });
      fetchNotifications();
      fetchUnreadCount();
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'task': return <CheckCircle size={16} className="text-primary-60" />;
      case 'lead': return <Target size={16} className="text-blue-400" />;
      case 'session': return <BookOpen size={16} className="text-yellow-400" />;
      case 'points': return <Trophy size={16} className="text-green-400" />;
      case 'redemption': return <Trophy size={16} className="text-primary" />;
      case 'system': return <User size={16} className="text-secondary" />;
      default: return <Bell size={16} className="text-secondary" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-full transition-colors relative ${isOpen ? 'bg-primary-90 text-on-surface' : 'text-secondary hover:bg-tertiary hover:text-on-surface'}`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-primary text-on-surface text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-surface">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-tertiary border border-primary-90 rounded-xl shadow-2xl z-[60] overflow-hidden flex flex-col max-h-[400px]">
          <div className="p-3 border-b border-primary-90 flex justify-between items-center bg-surface">
            <h3 className="text-label-md font-bold text-on-surface">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[10px] text-primary-60 hover:underline font-bold uppercase">Mark all read</button>
            )}
          </div>

          <div className="overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-secondary">
                <Bell size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3 border-b border-primary-90/50 flex items-start space-x-3 cursor-pointer transition-colors hover:bg-surface ${!n.is_read ? 'bg-primary-90/20' : ''}`}
                >
                  <div className="mt-1">{getIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-label-sm leading-tight ${!n.is_read ? 'text-on-surface font-semibold' : 'text-secondary'}`}>
                      {n.title}
                    </p>
                    <p className="text-body-sm text-secondary line-clamp-2 mt-0.5">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-secondary mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
