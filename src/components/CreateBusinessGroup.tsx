import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from 'react-modal';

interface BusinessGroup {
  id: number;
  nome_grupo: string;
  status_acesso: boolean;
}

const CreateBusinessGroup: React.FC = () => {
  const [businessGroups, setBusinessGroups] = useState<BusinessGroup[]>([]);
  const [groupName, setGroupName] = useState('');
  const [editGroupId, setEditGroupId] = useState<number | null>(null);
  const [successModalIsOpen, setSuccessModalIsOpen] = useState(false);

  Modal.setAppElement('#root');

  useEffect(() => {
    fetchBusinessGroups();
  }, []);

  const fetchBusinessGroups = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/grupo-empresarial');
      setBusinessGroups(response.data);
    } catch (error) {
      console.error('Erro ao buscar grupos empresariais:', error);
      alert('Erro ao carregar os grupos empresariais.');
    }
  };

  const handleAddOrEditGroup = async () => {
    try {
      if (editGroupId) {
        await axios.put(`http://127.0.0.1:8000/api/grupo-empresarial/${editGroupId}`, {
          nome_grupo: groupName,
        });
        setEditGroupId(null);
      } else {
        await axios.post('http://127.0.0.1:8000/api/grupo-empresarial', {
          nome_grupo: groupName,
        });
      }

      setGroupName('');
      fetchBusinessGroups();
      setSuccessModalIsOpen(true);
      setTimeout(() => setSuccessModalIsOpen(false), 2000);
    } catch (error) {
      console.error('Erro ao adicionar ou editar o grupo empresarial:', error);
      alert('Erro ao adicionar ou editar o grupo empresarial.');
    }
  };

  const handleEditClick = (group: BusinessGroup) => {
    setEditGroupId(group.id);
    setGroupName(group.nome_grupo);
  };

  const handleDeleteClick = async (groupId: number) => {
    if (window.confirm('Tem certeza que deseja excluir este grupo?')) {
      try {
        await axios.delete(`http://127.0.0.1:8000/api/grupo-empresarial/${groupId}`);
        fetchBusinessGroups();
      } catch (error) {
        console.error('Erro ao deletar grupo empresarial:', error);
        alert('Erro ao deletar o grupo empresarial.');
      }
    }
  };

  const handleToggleAccess = async (group: BusinessGroup) => {
    try {
      const newStatus = !group.status_acesso;
      await axios.patch(`http://127.0.0.1:8000/api/grupo-empresarial/${group.id}/status`, {
        status_acesso: newStatus,
      });
      fetchBusinessGroups();
    } catch (error) {
      console.error('Erro ao alterar o status de acesso:', error);
      alert('Erro ao alterar o status de acesso do grupo.');
    }
  };

  const AccessSwitch: React.FC<{ group: BusinessGroup }> = ({ group }) => (
    <div
      className={`flex items-center cursor-pointer w-16 p-1 rounded-full ${group.status_acesso ? 'bg-green-600' : 'bg-gray-400'
        }`}
      onClick={() => handleToggleAccess(group)}
    >
      <span
        className={`text-xs text-white font-semibold transition-opacity ${group.status_acesso ? 'opacity-100 order-last ml-1' : 'opacity-100 order-first mr-1'
          }`}
      >
        {group.status_acesso ? '' : 'OFF'}
      </span>
      <div
        className="w-6 h-6 rounded-full bg-white shadow-md transform transition-transform"
        style={{
          transform: group.status_acesso ? 'translateX(1rem)' : 'translateX(0)',
        }}
      ></div>
    </div>
  );

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Cadastrar Grupo Empresarial</h2>
      <input
        type="text"
        placeholder="Nome do grupo"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        className="mb-4 p-2 border rounded w-full"
      />
      <button
        onClick={handleAddOrEditGroup}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        {editGroupId ? 'Salvar Alterações' : 'Adicionar Grupo'}
      </button>

      <h3 className="text-lg font-semibold mt-6">Grupos Empresariais</h3>
      <table className="w-full text-left border-collapse border border-gray-300 mt-4">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-300 p-2">Nome</th>
            <th className="border border-gray-300 p-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {businessGroups.map((group) => (
            <tr key={group.id}>
              <td className="border border-gray-300 p-2">{group.nome_grupo}</td>
              <td className="border border-gray-300 p-2 flex gap-2 items-center">
                <AccessSwitch group={group} />
                <button
                  onClick={() => handleEditClick(group)}
                  className="px-4 py-2 bg-yellow-500 text-white rounded"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDeleteClick(group.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded"
                >
                  Deletar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal
        isOpen={successModalIsOpen}
        onRequestClose={() => setSuccessModalIsOpen(false)}
        className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75"
      >
        <div className="bg-white p-6 rounded shadow-lg text-center">
          <h2 className="text-lg font-semibold mb-4">Sucesso!</h2>
          <p>{editGroupId ? 'Grupo empresarial editado com sucesso!' : 'Grupo empresarial adicionado com sucesso!'}</p>
          <button
            onClick={() => setSuccessModalIsOpen(false)}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
          >
            Fechar
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default CreateBusinessGroup;
