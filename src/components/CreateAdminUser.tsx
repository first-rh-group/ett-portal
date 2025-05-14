import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface BusinessGroup {
  id: number;
  nome_grupo: string;
}

interface Usuario {
  id: number;
  nome: string;
  email: string;
  super_usuario: boolean;
  grupo_empresarial_id: number | null;
}

interface CreateAdminUserProps {
  grupoEmpresarialId?: number;
}

const CreateAdminUser: React.FC<CreateAdminUserProps> = ({ grupoEmpresarialId }) => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [businessGroups, setBusinessGroups] = useState<BusinessGroup[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);

  // Estados para criação/edição
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [grupoEmpresarialIdState, setGrupoEmpresarialIdState] = useState<number | null>(
    grupoEmpresarialId || null
  );
  const [superUsuario, setSuperUsuario] = useState(false);

  // Função para buscar grupos empresariais e usuários
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setErrorMessage('Usuário não autenticado. Faça login novamente.');
        return;
      }

      try {
        const groupsResponse = await axios.get('http://127.0.0.1:8000/api/grupo-empresarial', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBusinessGroups(groupsResponse.data);

        const usersResponse = await axios.get('http://127.0.0.1:8000/api/usuarios', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsuarios(usersResponse.data);
      } catch (error) {
        setErrorMessage('Erro ao carregar dados. Tente novamente.');
      }
    };

    fetchData();
  }, []);

  const openModalForCreate = () => {
    setIsEditing(false);
    setNome('');
    setEmail('');
    setSenha('');
    setGrupoEmpresarialIdState(null);
    setSuperUsuario(false);
    setIsModalOpen(true);
  };

  const openModalForEdit = (user: Usuario) => {
    setIsEditing(true);
    setEditingUser(user);
    setNome(user.nome);
    setEmail(user.email);
    setSenha('');
    setGrupoEmpresarialIdState(user.grupo_empresarial_id);
    setSuperUsuario(user.super_usuario);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      setErrorMessage('Usuário não autenticado. Faça login novamente.');
      return;
    }

    try {
      const payload = {
        nome,
        email,
        senha: senha || undefined,
        grupo_empresarial_id: !superUsuario ? grupoEmpresarialIdState : null,
        super_usuario: superUsuario,
      };

      if (isEditing && editingUser) {
        // Atualização de usuário
        await axios.put(`http://127.0.0.1:8000/api/usuarios/${editingUser.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccessMessage('Usuário atualizado com sucesso!');
      } else {
        // Criação de novo usuário
        await axios.post('http://127.0.0.1:8000/api/usuarios', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccessMessage('Usuário criado com sucesso!');
      }

      setIsModalOpen(false);

      const usersResponse = await axios.get('http://127.0.0.1:8000/api/usuarios', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsuarios(usersResponse.data);
    } catch (error) {
      setErrorMessage('Erro ao salvar usuário. Verifique os dados.');
    }
  };

  const handleDelete = async (userId: number) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setErrorMessage('Usuário não autenticado. Faça login novamente.');
      return;
    }

    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        await axios.delete(`http://127.0.0.1:8000/api/usuarios/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsuarios(usuarios.filter((user) => user.id !== userId));
        setSuccessMessage('Usuário deletado com sucesso!');
      } catch (error) {
        setErrorMessage('Erro ao deletar usuário.');
      }
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Usuários Criados</h2>
      {successMessage && <div className="mb-4 text-green-700">{successMessage}</div>}
      {errorMessage && <div className="mb-4 text-red-700">{errorMessage}</div>}

      <button
        onClick={openModalForCreate}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Adicionar Usuário
      </button>

      <table className="w-full text-left border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-300 p-2">Nome</th>
            <th className="border border-gray-300 p-2">Email</th>
            <th className="border border-gray-300 p-2">Super Admin</th>
            <th className="border border-gray-300 p-2">Grupo Empresarial</th>
            <th className="border border-gray-300 p-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((user) => {
            const grupoEmpresarial = user.grupo_empresarial_id
              ? businessGroups.find((group) => group.id === user.grupo_empresarial_id)?.nome_grupo
              : "Sem grupo empresarial";

            return (
              <tr key={user.id}>
                <td className="border border-gray-300 p-2">{user.nome}</td>
                <td className="border border-gray-300 p-2">{user.email}</td>
                <td className="border border-gray-300 p-2">{user.super_usuario ? 'Sim' : 'Não'}</td>
                <td className="border border-gray-300 p-2">{grupoEmpresarial}</td>
                <td className="border border-gray-300 p-2 flex gap-2">
                  <button
                    onClick={() => openModalForEdit(user)}
                    className="px-4 py-2 bg-yellow-500 text-white rounded"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="px-4 py-2 bg-red-500 text-white rounded"
                  >
                    Deletar
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-lg font-semibold mb-4">
              {isEditing ? 'Editar Usuário' : 'Criar Usuário'}
            </h2>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mb-4 p-2 border rounded w-full"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mb-4 p-2 border rounded w-full"
                required
              />
              <input
                type="password"
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="mb-4 p-2 border rounded w-full"
              />
              <select
                value={grupoEmpresarialIdState || ''}
                onChange={(e) => setGrupoEmpresarialIdState(Number(e.target.value))}
                className="mb-4 p-2 border rounded w-full"
                disabled={superUsuario}
              >
                <option value="">Selecione o grupo empresarial</option>
                {businessGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.nome_grupo}
                  </option>
                ))}
              </select>
              <label className="flex items-center mb-4">
                <input
                  type="checkbox"
                  checked={superUsuario}
                  onChange={(e) => setSuperUsuario(e.target.checked)}
                  className="mr-2"
                />
                Super Admin
              </label>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  type="button"
                  className="px-4 py-2 bg-gray-500 text-white rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded"
                >
                  {isEditing ? 'Salvar Alterações' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateAdminUser;
