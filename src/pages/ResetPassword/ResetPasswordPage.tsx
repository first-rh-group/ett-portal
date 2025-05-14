import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import portalBackground from '../../images/portal_fundo.png';

const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setError('Token não encontrado na URL.');
    } else {
      console.log("Token recebido:", token);
    }
  }, [token]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      setLoading(false);
      return;
    }

    const payload = {
      token,
      password,
      password_confirmation: confirmPassword,
    };

    console.log("Payload para reset de senha:", payload);

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/reset-password', payload);

      setMessage('Senha redefinida com sucesso! Redirecionando para o login...');
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error: any) {
      console.error('Erro ao redefinir senha:', error);

      if (error.response?.data?.errors) {
        const validationErrors = Object.values(error.response.data.errors).flat();
        setError(validationErrors.join(', '));
      } else {
        setError(
          error.response?.data?.message || 'Erro ao redefinir senha. Tente novamente.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex items-center justify-center h-screen bg-gray-100"
      style={{
        backgroundImage: `url(${portalBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <form onSubmit={handlePasswordReset} className="bg-white p-6 rounded shadow-md w-80">
        <h2 className="text-lg font-bold mb-4 text-center">Redefinir Senha</h2>

        {error && <p className="text-sm mb-4 text-center text-red-500">{error}</p>}
        {message && <p className="text-sm mb-4 text-center text-green-500">{message}</p>}

        <input
          type="password"
          placeholder="Nova senha"
          className="border p-2 mb-4 w-full"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <input
          type="password"
          placeholder="Confirme a nova senha"
          className="border p-2 mb-4 w-full"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
        />
        <button
          type="submit"
          className="bg-blue-500 text-white p-2 w-full rounded"
          disabled={loading}
        >
          {loading ? 'Carregando...' : 'Redefinir Senha'}
        </button>
      </form>
    </div>
  );
};

export default ResetPasswordPage;