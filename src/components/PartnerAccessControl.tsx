import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface BusinessGroup {
  id: number;
  nome_grupo: string;
  status_acesso: boolean;
}

interface Partner {
  id: number;
  codigo_secao: string;
  descricao_secao: string;
}

const PartnerAccessControl: React.FC = () => {
  const [businessGroups, setBusinessGroups] = useState<BusinessGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [availablePartners, setAvailablePartners] = useState<Partner[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchBusinessGroups = async () => {
      try {
        const response = await axios.get('http://127.0.0.1:8000/api/grupos-empresariais');
        setBusinessGroups(response.data);
      } catch (error) {
        console.error('Erro ao buscar grupos empresariais:', error);
      }
    };

    fetchBusinessGroups();
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      const fetchPartners = async () => {
        try {
          const response = await axios.get(`http://127.0.0.1:8000/api/grupos-empresariais/${selectedGroupId}/empresas`);
          setPartners(response.data);
        } catch (error) {
          console.error('Erro ao buscar empresas do grupo empresarial:', error);
        }
      };
      fetchPartners();
    } else {
      setPartners([]);
    }
  }, [selectedGroupId]);

  useEffect(() => {
    const fetchAvailablePartners = async () => {
      try {
        const response = await axios.get('http://127.0.0.1:8000/api/empresas-disponiveis');
        const sortedPartners = response.data.sort((a: Partner, b: Partner) =>
          a.descricao_secao.localeCompare(b.descricao_secao)
        );
        setAvailablePartners(sortedPartners);
        setTotalPages(Math.ceil(sortedPartners.length / recordsPerPage));
      } catch (error) {
        console.error('Erro ao buscar empresas disponíveis:', error);
      }
    };

    fetchAvailablePartners();
  }, [recordsPerPage]);

  const associatePartnerToGroup = async (partnerId: number) => {
    if (!selectedGroupId) {
      alert('Selecione um grupo empresarial antes de associar.');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`http://127.0.0.1:8000/api/grupos-empresariais/${selectedGroupId}/associar`, {
        empresas: [partnerId],
      });
      alert('Empresa associada com sucesso!');
      setPartners([...partners, availablePartners.find((p) => p.id === partnerId)!]);
    } catch (error) {
      console.error('Erro ao associar empresa ao grupo:', error);
      alert('Erro ao associar empresa. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const disassociatePartnerFromGroup = async (partnerId: number) => {
    if (!selectedGroupId) {
      alert('Selecione um grupo empresarial antes de desassociar.');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`http://127.0.0.1:8000/api/grupos-empresariais/${selectedGroupId}/desassociar`, {
        empresas: [partnerId],
      });
      alert('Empresa desassociada com sucesso!');
      setPartners(partners.filter((p) => p.id !== partnerId));
    } catch (error) {
      console.error('Erro ao desassociar empresa do grupo:', error);
      alert('Erro ao desassociar empresa. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const filteredPartners = availablePartners.filter((partner) =>
    partner.descricao_secao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentAvailablePartners = filteredPartners.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Controle de Acesso de Empresas Parceiras</h2>

      <label>Selecionar Grupo Empresarial:</label>
      <select
        value={selectedGroupId ?? ''}
        onChange={(e) => setSelectedGroupId(Number(e.target.value))}
        className="mb-4 p-2 border rounded"
      >
        <option value="">Selecione um grupo</option>
        {businessGroups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.nome_grupo}
          </option>
        ))}
      </select>

      <h3 className="text-lg font-semibold">Empresas no Grupo</h3>
      <table className="w-full text-left mt-4">
        <thead>
          <tr>
            <th className="border-b p-2">Código</th>
            <th className="border-b p-2">Nome da Empresa</th>
            <th className="border-b p-2">Ação</th>
          </tr>
        </thead>
        <tbody>
          {partners.map((partner) => (
            <tr key={partner.id}>
              <td className="border-b p-2">{partner.codigo_secao}</td>
              <td className="border-b p-2">{partner.descricao_secao}</td>
              <td className="border-b p-2">
                <button
                  onClick={() => disassociatePartnerFromGroup(partner.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded"
                >
                  Desassociar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="text-lg font-semibold mt-6">Associar Nova Empresa ao Grupo</h3>

      <input
        type="text"
        placeholder="Pesquisar empresa"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4 p-2 border rounded w-full"
      />

      <ul className="mt-2">
        {currentAvailablePartners
          .filter((partner) => !partners.some((p) => p.id === partner.id))
          .map((partner) => (
            <li key={partner.id} className="flex items-center justify-between mb-2">
              <span>{partner.descricao_secao}</span>
              <button
                onClick={() => associatePartnerToGroup(partner.id)}
                className="px-4 py-2 bg-blue-500 text-white rounded"
                disabled={loading}
              >
                Associar
              </button>
            </li>
          ))}
      </ul>

      {/* Paginação e Registros por Página */}
      <div className="flex flex-col items-center mt-4">
        <div className="flex items-center gap-4 mb-2">
          <label htmlFor="recordsPerPage" className="text-gray-700 font-medium">
            Registros por página:
          </label>
          <input
            id="recordsPerPage"
            type="number"
            value={recordsPerPage}
            onChange={(e) => {
              const value = Math.max(1, parseInt(e.target.value, 10) || 1);
              setRecordsPerPage(value);
              setCurrentPage(1);
            }}
            className="w-16 p-2 border rounded"
            min="1"
          />
        </div>
        <div className="flex justify-center items-center">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            className={`px-4 py-2 rounded-lg font-semibold ${currentPage === 1
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
          >
            Anterior
          </button>
          <span className="mx-4 text-lg font-medium text-gray-700">
            Página {currentPage} de {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            className={`px-4 py-2 rounded-lg font-semibold ${currentPage === totalPages
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
};

export default PartnerAccessControl;
