import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
// ... imports ...

interface LayoutProps {
  // children removido pois usaremos Outlet
}

// ... SidebarItem ...

const Layout: React.FC<LayoutProps> = () => {
  // ... hooks ...

  return (
    <div className="min-h-screen bg-brand-dark flex font-sans text-zinc-100 selection:bg-brand-gold/30 selection:text-white">
      {/* ... Sidebar ... */}

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 flex flex-col min-h-screen relative bg-brand-dark">
        {/* ... Header ... */}

        {/* View Content */}
        <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto w-full animate-fade-in pb-24">
          <Outlet />
        </div>
      </main>

      {/* ... Command Palette ... */}
    </div>
  );
};

export default Layout;