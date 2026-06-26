import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { LayoutDashboard, Users, Grid, CreditCard, LogOut, Settings as SettingsIcon, RefreshCw } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { confirm } = useConfirm();

  const handleLogout = async () => {
    const isConfirmed = await confirm({
      title: 'Déconnexion',
      message: 'Êtes-vous sûr de vouloir vous déconnecter ?'
    });
    
    if (isConfirmed) {
      await signOut();
      navigate('/login');
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Clients', path: '/clients', icon: Users },
    { name: 'Services', path: '/services', icon: Grid },
    { name: 'Paiements', path: '/payments', icon: CreditCard },
    { name: 'Paramètres', path: '/settings', icon: SettingsIcon },
  ];

  // TODO: Replace with dynamic data from accountants table when multi-user is needed
  const userProfile = {
    name: "Ali Alaoui",
    role: "Comptable agréé",
    avatar: "/avatar.jpeg"
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card h-full">
        <div className="p-6">
          <div className="flex items-center space-x-4 mb-1">
            <img 
              src={userProfile.avatar} 
              alt={userProfile.name} 
              className="w-12 h-12 rounded-full border border-border object-cover"
            />
            <div>
              <h2 className="text-lg font-bold text-card-foreground leading-tight">{userProfile.name}</h2>
              <p className="text-sm text-muted-foreground">{userProfile.role}</p>
            </div>
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4">AccountFlow</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`
                }
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <button
            onClick={handleRefresh}
            className="flex items-center w-full px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5 mr-3" />
            Actualiser
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {/* Mobile Header */}
          <div className="md:hidden flex justify-between items-center mb-6">
            <div className="flex items-center space-x-3">
              <img 
                src={userProfile.avatar} 
                alt={userProfile.name} 
                className="w-10 h-10 rounded-full border border-border object-cover"
              />
              <div>
                <h2 className="text-base font-bold text-foreground leading-tight">{userProfile.name}</h2>
                <p className="text-xs text-muted-foreground">{userProfile.role}</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button onClick={handleRefresh} className="p-2 text-muted-foreground hover:text-foreground">
                <RefreshCw className="w-5 h-5" />
              </button>
              <button onClick={handleLogout} className="p-2 text-muted-foreground hover:text-foreground">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around items-center h-16 px-2 z-50">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center w-full h-full space-y-1 ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default MainLayout;
