import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import VerificationPage from './pages/VerificationPage';
import DashboardPages from './pages/DashboardPages';
import DashboardFiltered from './pages/DashboardFiltered';
import DashboardPagesFiltrado from './pages/DashboardPagesFiltrado';
import ResetPasswordPage from './pages/ResetPassword/ResetPasswordPage';
import PrivateRoute from './components/PrivateRoute';
import SuperUserMenu from './components/SuperUserMenu';
import PartnerAccessControl from './components/PartnerAccessControl';
import CreateBusinessGroup from './components/CreateBusinessGroup';
import CreateAdminUser from './components/CreateAdminUser';

// Componente para redirecionar após o login
const RedirectAfterLogin: React.FC = () => {
  const navigate = useNavigate();
  React.useEffect(() => {
    const userString = localStorage.getItem("user");
    if (userString) {
      const user = JSON.parse(userString);
      if (user.super_usuario === 1) {
        navigate("/dashboardpages");
      } else {
        navigate("/dashboardpagesfiltrado");
      }
    } else {
      navigate("/");
    }
  }, [navigate]);
  return null;
};

function App() {
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const toggleMenu = () => setIsMenuCollapsed(prev => !prev);

  return (
    <Router>
      <Routes>
        {/* Rotas públicas */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/verify" element={<VerificationPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

        {/* Rota para redirecionamento pós-login */}
        <Route path="/redirect" element={<RedirectAfterLogin />} />

        {/* Rotas protegidas */}
        <Route
          path="/dashboardpages/:type?"
          element={
            <PrivateRoute>
              <div className="flex min-h-screen">
                <SuperUserMenu isCollapsed={isMenuCollapsed} toggleMenu={toggleMenu} />
                <div className={`flex-1 p-6 transition-all ${isMenuCollapsed ? 'ml-16' : 'ml-64'}`}>
                  <DashboardPages />
                </div>
              </div>
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboardpagesfiltrado"
          element={
            <PrivateRoute>
              <DashboardPagesFiltrado />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard-filtered"
          element={
            <PrivateRoute>
              <DashboardFiltered />
            </PrivateRoute>
          }
        />
        <Route
          path="/config/partner-access"
          element={
            <PrivateRoute>
              <div className="flex min-h-screen">
                <SuperUserMenu isCollapsed={isMenuCollapsed} toggleMenu={toggleMenu} />
                <div className={`flex-1 p-6 transition-all ${isMenuCollapsed ? 'ml-16' : 'ml-64'}`}>
                  <PartnerAccessControl />
                </div>
              </div>
            </PrivateRoute>
          }
        />
        <Route
          path="/config/create-business-group"
          element={
            <PrivateRoute>
              <div className="flex min-h-screen">
                <SuperUserMenu isCollapsed={isMenuCollapsed} toggleMenu={toggleMenu} />
                <div className={`flex-1 p-6 transition-all ${isMenuCollapsed ? 'ml-16' : 'ml-64'}`}>
                  <CreateBusinessGroup />
                </div>
              </div>
            </PrivateRoute>
          }
        />
        <Route
          path="/config/create-admin-user"
          element={
            <PrivateRoute>
              <div className="flex min-h-screen">
                <SuperUserMenu isCollapsed={isMenuCollapsed} toggleMenu={toggleMenu} />
                <div className={`flex-1 p-6 transition-all ${isMenuCollapsed ? 'ml-16' : 'ml-64'}`}>
                  <CreateAdminUser grupoEmpresarialId={1} />
                </div>
              </div>
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
