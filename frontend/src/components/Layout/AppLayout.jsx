import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { 
  Menu, ChevronLeft, LogOut, 
  LayoutDashboard, LifeBuoy, HeartHandshake, Bot,
  PieChart, Bell, Siren, Box,
  ShieldAlert, Map, Activity, FlaskConical, FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_CONFIG = {
  citizen: [
    { name: 'Dashboard', path: '/citizen', icon: LayoutDashboard },
    { name: 'SOS', path: '/citizen/sos', icon: LifeBuoy },
    { name: 'Help Others', path: '/citizen/help', icon: HeartHandshake },
    { name: 'AI Assistant', path: '/citizen/ai', icon: Bot },
  ],
  collector: [
    { name: 'Overview', path: '/collector', icon: PieChart },
    { name: 'Alerts', path: '/collector/alerts', icon: Bell },
    { name: 'SOS Management', path: '/collector/sos', icon: Siren },
    { name: 'Resources', path: '/collector/resources', icon: Box },
    { name: 'AI Assistant', path: '/collector/ai', icon: Bot },
  ],
  district_authority: [
    { name: 'Command Center', path: '/authority', icon: ShieldAlert },
    { name: 'Risk Map', path: '/authority/map', icon: Map },
    { name: 'Events', path: '/authority/events', icon: Activity },
    { name: 'Simulation Lab', path: '/authority/simulation', icon: FlaskConical },
    { name: 'AI Assistant', path: '/authority/ai', icon: Bot },
    { name: 'Reports', path: '/authority/reports', icon: FileText },
  ],
  state_authority: [
    { name: 'Command Center', path: '/authority', icon: ShieldAlert },
    { name: 'Risk Map', path: '/authority/map', icon: Map },
    { name: 'Events', path: '/authority/events', icon: Activity },
    { name: 'Simulation Lab', path: '/authority/simulation', icon: FlaskConical },
    { name: 'AI Assistant', path: '/authority/ai', icon: Bot },
    { name: 'Reports', path: '/authority/reports', icon: FileText },
  ],
  ndma: [
    { name: 'Command Center', path: '/authority', icon: ShieldAlert },
    { name: 'Risk Map', path: '/authority/map', icon: Map },
    { name: 'Events', path: '/authority/events', icon: Activity },
    { name: 'Simulation Lab', path: '/authority/simulation', icon: FlaskConical },
    { name: 'AI Assistant', path: '/authority/ai', icon: Bot },
    { name: 'Reports', path: '/authority/reports', icon: FileText },
  ]
};

const getRoleBadgeClasses = (role) => {
  switch (role) {
    case 'citizen': return 'bg-theme-primary/10 text-theme-primary border-theme-primary/25';
    case 'collector': return 'bg-theme-primary/10 text-theme-primary border-theme-primary/25';
    case 'district_authority': return 'bg-theme-warning/15 text-theme-warning border-theme-warning/35';
    case 'state_authority': return 'bg-theme-warning/15 text-theme-warning border-theme-warning/35';
    case 'ndma': return 'bg-theme-danger/10 text-theme-danger border-theme-danger/30';
    default: return 'bg-theme-primary/10 text-theme-primary border-theme-primary/25';
  }
};

const formatRole = (role) => {
  if (!role) return '';
  return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const AppLayout = ({ children }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = user?.role ? NAV_CONFIG[user.role] || [] : [];
  const themeClass = user?.role === 'citizen' ? 'theme-citizen' : 'theme-authority';

  return (
    <div className={`flex h-screen bg-theme-bg text-theme-text overflow-hidden font-sans ${themeClass}`}>
      {/* Sidebar */}
      <aside 
        className={`${isExpanded ? 'w-60' : 'w-16'} flex-shrink-0 border-r border-theme-border bg-theme-bg flex flex-col transition-all duration-300 ease-in-out relative z-20`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-theme-border">
          {isExpanded && <span className="font-bold text-xl truncate text-theme-primary">Crisora AI</span>}
          <button 
            onClick={() => setIsExpanded(!isExpanded)} 
            className="p-1.5 rounded-md hover:bg-theme-card text-theme-muted transition-colors mx-auto"
          >
            {isExpanded ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 space-y-2">
          {navItems.map((item) => {
            // Check active route strictly to avoid nested path highlighting issues
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(`${item.path}/`));
            
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`flex items-center px-4 py-3 mx-2 rounded-lg transition-all border-l-2 ${
                  isActive 
                    ? 'bg-theme-primary/10 text-theme-primary border-theme-primary' 
                    : 'text-theme-muted hover:bg-theme-card hover:text-theme-text border-transparent'
                }`}
                title={!isExpanded ? item.name : undefined}
              >
                <item.icon size={20} className={isActive ? 'text-theme-primary flex-shrink-0' : 'text-theme-muted flex-shrink-0'} />
                {isExpanded && <span className="ml-3 font-medium whitespace-nowrap">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-theme-border bg-theme-card/75 relative z-10 backdrop-blur-sm">
          <div className="flex items-center">
            {/* Show app name on mobile or when collapsed if preferred, here keeping it clean */}
            {!isExpanded && <span className="font-bold text-xl sm:hidden text-theme-primary">Crisora AI</span>}
          </div>
          
          <div className="flex items-center gap-4">
            <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold tracking-wide ${getRoleBadgeClasses(user?.role)}`}>
              {formatRole(user?.role)}
            </span>
            <span className="font-medium text-theme-text hidden sm:block">{user?.name}</span>
            <div className="w-px h-6 bg-theme-border hidden sm:block"></div>
            <button 
              onClick={handleLogout} 
              className="text-theme-muted hover:text-theme-danger transition-colors flex items-center group cursor-pointer"
            >
              <LogOut size={18} className="group-hover:scale-110 transition-transform" />
              <span className="ml-2 hidden sm:block font-medium">Logout</span>
            </button>
          </div>
        </header>

        {/* Main page content */}
        <main className="flex-1 overflow-y-auto p-6 bg-theme-bg relative">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
