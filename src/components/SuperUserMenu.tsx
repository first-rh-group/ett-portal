import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const SuperUserMenu: React.FC<{ isCollapsed: boolean; toggleMenu: () => void }> = ({
  isCollapsed,
  toggleMenu,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [openMenu, setOpenMenu] = useState<{ [key: string]: boolean }>({
    clientes: false,
    configuracoes: false,
  });

  // Atualize o logout para redirecionar para a rota de login ("/")
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const toggleSubMenu = (menu: string) => {
    setOpenMenu((prevState) => ({
      ...prevState,
      [menu]: !prevState[menu],
    }));
  };

  return (
    <div
      className={`bg-gray-800 text-white ${isCollapsed ? "w-16" : "w-64"} flex flex-col transition-all`}
      style={{ position: "fixed", minHeight: "100vh", height: "100%" }}
    >
      <h2 className={`text-3xl font-semibold p-6 text-center border-b border-gray-700 ${isCollapsed ? "hidden" : ""}`}>
        Painel Admin
      </h2>
      <button
        className="self-end mr-4 mt-2 text-white hover:text-red-400"
        onClick={toggleMenu}
      >
        {isCollapsed ? "☰" : "✕"}
      </button>

      <div className="flex-1 p-4 overflow-hidden">
        {/* Menu Clientes */}
        <div className="mb-4">
          <button
            onClick={() => toggleSubMenu("clientes")}
            className="w-full text-left px-4 py-2 font-semibold flex justify-between items-center hover:bg-blue-600 rounded transition-all duration-300"
          >
            <span className={`${isCollapsed ? "hidden" : ""}`}>Clientes</span>
            {!isCollapsed && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 transition-transform duration-300 ${openMenu.clientes ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>

          {!isCollapsed && openMenu.clientes && (
            <ul className="mt-2 space-y-2 animate-fade-in">
              <li>
                <Link
                  to="/dashboardpages"
                  className={`block px-6 py-2 rounded ${
                    location.pathname === "/dashboardpages" ? "bg-blue-500" : "hover:bg-blue-600"
                  }`}
                >
                  Todos Clientes
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboardpages/ett"
                  className={`block px-6 py-2 rounded ${
                    location.pathname === "/dashboardpages/ett" ? "bg-blue-500" : "hover:bg-blue-600"
                  }`}
                >
                  Clientes ETT
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboardpages/shift"
                  className={`block px-6 py-2 rounded ${
                    location.pathname === "/dashboardpages/shift" ? "bg-blue-500" : "hover:bg-blue-600"
                  }`}
                >
                  Clientes SHIFT
                </Link>
              </li>
            </ul>
          )}
        </div>

        {/* Menu Configurações */}
        <div className="mb-4">
          <button
            onClick={() => toggleSubMenu("configuracoes")}
            className="w-full text-left px-4 py-2 font-semibold flex justify-between items-center hover:bg-blue-600 rounded transition-all duration-300"
          >
            <span className={`${isCollapsed ? "hidden" : ""}`}>Configurações</span>
            {!isCollapsed && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 transition-transform duration-300 ${openMenu.configuracoes ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>

          {!isCollapsed && openMenu.configuracoes && (
            <ul className="mt-2 space-y-2 animate-fade-in">
              <li>
                <Link
                  to="/config/partner-access"
                  className="block px-6 py-2 rounded hover:bg-blue-600"
                >
                  Controle de Acesso de Parceiros
                </Link>
              </li>
              <li>
                <Link
                  to="/config/create-business-group"
                  className="block px-6 py-2 rounded hover:bg-blue-600"
                >
                  Cadastrar Grupo Empresarial
                </Link>
              </li>
              <li>
                <Link
                  to="/config/create-admin-user"
                  className="block px-6 py-2 rounded hover:bg-blue-600"
                >
                  Cadastrar Usuário Administrativo
                </Link>
              </li>
            </ul>
          )}
        </div>
      </div>

      {/* Botão de Sair fixo */}
      <div
        className="p-4 border-t border-gray-700"
        style={{ position: "absolute", bottom: 0, width: isCollapsed ? "4rem" : "16rem" }}
      >
        <button
          onClick={handleLogout}
          className={`w-full py-2 text-center rounded bg-red-500 hover:bg-red-600 ${isCollapsed ? "w-10 px-2" : "w-full px-4"}`}
        >
          {isCollapsed ? "⎋" : "Sair"}
        </button>
      </div>
    </div>
  );
};

export default SuperUserMenu;
