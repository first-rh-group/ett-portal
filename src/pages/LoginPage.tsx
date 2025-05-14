import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import portalFundo from '../images/portal_fundo.png';
import firstrhLogo from '../images/firstrhgroup_logo.jpg';
import firstRHLogo from '../images/FirstRH_Group_LOGO_SEM FUNDO.png';
import ettLogo from '../images/ETT LOGO SEM FUNDO.png';
import shiftLogo from '../images/Shift LOGO SEM FUNDO.png';
import firstConnectingLogo from '../images/First Connecting LOGO SEM FUNDO.png';
import dtcLogo from '../images/logo_dtc_horiz_sistema-ALpbl8RDJBhe1abP.png'; // Caminho para o logo adicionado
import './LoginPage.css'; // Arquivo de estilos para animações

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberLogin, setRememberLogin] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/login', {
        email,
        senha: password,
      });

      if (response.status !== 200) {
        throw new Error(response.data.message || 'Erro desconhecido ao realizar login.');
      }

      // Armazena o token e os dados do usuário no localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.usuario));

      if (rememberLogin) {
        localStorage.setItem('email', email);
        localStorage.setItem('rememberLogin', 'true');
      } else {
        localStorage.removeItem('email');
        localStorage.removeItem('rememberLogin');
      }

      const isSuperAdmin = response.data.usuario.super_usuario;
      const grupoEmpresarialId = response.data.usuario.grupo_empresarial_id;

      // Redireciona conforme o perfil do usuário:
      if (isSuperAdmin === 1) {
        navigate('/dashboardpages');
      } else if (grupoEmpresarialId) {
        navigate('/DashboardPagesFiltrado');
      } else {
        alert('Usuário sem permissão válida. Contate o administrador.');
      }
    } catch (error: any) {
      console.error('Erro ao realizar login:', error);
      setErrorMessage(
        error.response?.data?.message || 'Erro ao realizar login. Verifique suas credenciais.'
      );
    }
  };

  const handleOpenModal = () => {
    setResetMessage('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handlePasswordReset = async () => {
    setIsSending(true);
    try {
      await axios.post('http://127.0.0.1:8000/api/password-reset', {
        email: resetEmail,
      });
      setResetMessage('E-mail de redefinição de senha enviado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao enviar solicitação de redefinição:', error);
      setResetMessage(
        error.response?.data?.message || 'Erro ao enviar a solicitação. Tente novamente.'
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="flex items-center justify-center h-screen relative flex-col md:flex-row"
      style={{
        backgroundImage: `url(${portalFundo})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Logos do cliente no canto superior esquerdo */}
      <div
        className="bg-white p-4 rounded-lg flex flex-col items-center mb-4 md:mb-0 md:absolute md:left-4 md:top-4 animate-container"
        style={{ width: '300px', height: 'auto' }}
      >
        <img
          src={firstRHLogo}
          alt="First RH Group"
          className="w-full h-auto mb-4 animate-fade-in"
        />
        <hr className="w-full border-t-4 border-gray-500 my-4 animate-line" />
        <img
          src={ettLogo}
          alt="ETT"
          className="w-full h-auto mb-4 animate-fade-in"
          style={{ animationDelay: '0.5s' }}
        />
        <img
          src={shiftLogo}
          alt="Shift"
          className="w-full h-auto mb-4 animate-fade-in"
          style={{ animationDelay: '1s' }}
        />
        <img
          src={firstConnectingLogo}
          alt="First Connecting"
          className="animate-fade-in"
          style={{
            animationDelay: '1.5s',
            width: 'auto',
            maxWidth: '400px',
            height: 'auto',
            marginBottom: '1rem',
            marginLeft: '130px',
          }}
        />
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded w-80 mx-4"
        style={{
          boxShadow: '0 15px 15px rgba(0, 0, 0, 0.1), 0 10px 55px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div className="flex justify-center mb-4">
          <img src={firstrhLogo} alt="First RH Group Logo" className="h-12" />
        </div>
        {errorMessage && <p className="text-red-500 text-sm mb-4">{errorMessage}</p>}
        <input
          type="email"
          placeholder="Email"
          className="border p-2 mb-4 w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Senha"
          className="border p-2 mb-4 w-full"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <label className="flex items-center mb-4">
          <input
            type="checkbox"
            checked={rememberLogin}
            onChange={(e) => setRememberLogin(e.target.checked)}
            className="mr-2"
          />
          Lembrar login
        </label>
        <button type="submit" className="bg-blue-500 text-white p-2 w-full rounded mb-4">
          Entrar
        </button>
        <button
          type="button"
          className="text-blue-500 text-sm w-full text-center"
          onClick={handleOpenModal}
        >
          Recuperar Senha
        </button>
      </form>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-md w-80 relative">
            <button
              className="absolute top-2 right-2 text-gray-500"
              onClick={handleCloseModal}
            >
              &times;
            </button>
            <h3 className="text-lg font-bold mb-4">Recuperar Senha</h3>
            <input
              type="email"
              placeholder="Digite seu e-mail"
              className="border p-2 mb-4 w-full"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
            />
            <button
              className="bg-blue-500 text-white p-2 w-full rounded"
              onClick={handlePasswordReset}
              disabled={isSending}
            >
              {isSending ? 'Enviando...' : 'Enviar'}
            </button>
            {resetMessage && (
              <p className="text-sm mt-4 text-center text-gray-700">{resetMessage}</p>
            )}
          </div>
        </div>
      )}

      {/* Rodapé com logo e texto */}
      <div className="absolute bottom-4 left-8 text-white text-xl flex flex-col items-center">
        <a
          href="https://www.datacampos.com.br/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-center"
        >
          <strong className="mb-2 text-black text-sm">Desenvolvido por</strong>
          <img src={dtcLogo} alt="DTC Logo" className="h-6 mx-auto mt-1" />
        </a>
      </div>
    </div>
  );
};

export default LoginPage;
