import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const VerificationPage: React.FC = () => {
  const [code, setCode] = useState('');
  const navigate = useNavigate();
  const email = localStorage.getItem('email');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await axios.post('http://localhost:5000/auth/verify-code', { email, code });
      const { token } = response.data;
      localStorage.setItem('token', token);
      navigate('/dashboard');
    } catch (error) {
      console.error('Erro ao verificar código', error);
      alert('Código inválido ou expirado.');
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md w-80">
        <h2 className="text-lg font-bold mb-4 text-center">Verificação</h2>
        <input
          type="text"
          placeholder="Código"
          className="border p-2 mb-4 w-full"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        <button type="submit" className="bg-blue-500 text-white p-2 w-full rounded">
          Verificar Código
        </button>
      </form>
    </div>
  );
};

export default VerificationPage;
