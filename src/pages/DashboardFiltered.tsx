import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";
import { Menu } from "@headlessui/react";
import { Bar } from "react-chartjs-2";
import Select from "react-select";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const DashboardFiltered: React.FC = () => {
  const [sections, setSections] = useState<string[]>([]); // Todas as seções
  const [filteredSections, setFilteredSections] = useState<string[]>([]); // Seções filtradas
  // const [selectedSection, setSelectedSection] = useState<string | null>(null); // Seção selecionada
  const [selectedSection, setSelectedSection] = useState<string[]>([]); // Suporte para múltiplas seleções


  const [funcoes, setFuncoes] = useState<string[]>([]); // Todas as funções
  const [selectedSituacao, setSelectedSituacao] = useState<string[]>([]); // Situações selecionadas
  const [situacoes, setSituacoes] = useState<string[]>([]); // Todas as situações disponíveis
  const [filteredFuncoes, setFilteredFuncoes] = useState<string[]>([]); // Funções filtradas
  //const [selectedFuncao, setSelectedFuncao] = useState<string | null>(null); // Função selecionada
  const [selectedFuncao, setSelectedFuncao] = useState<string[]>([]);


  const fetchFuncoes = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/dados-empresas`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          descricaoSecao: selectedSection.join(","), // Envia as seções selecionadas como filtro
          codigoSituacao: selectedSituacao.join(","),
        },
      });

      const data = response.data.dados as Array<{ NOME_FUNCAO: string }>;

      const uniqueFuncoes = Array.from(
        new Set(data.map((item) => item.NOME_FUNCAO.trim()))
      ).sort();

      setFuncoes(uniqueFuncoes);
      setFilteredFuncoes(uniqueFuncoes);
    } catch (error) {
      console.error("Erro ao buscar funções:", error);
    }
  };

  const fetchSituacoes = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/dados-empresas`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          // Opcional: adicionar filtros, se necessário
        },
      });

      const data = response.data.dados as Array<{ CODIGOSITACAO: string }>;

      const uniqueSituacoes = Array.from(
        new Set(data.map((item) => item.CODIGOSITACAO.trim()))
      ).sort();

      setSituacoes(uniqueSituacoes);
    } catch (error) {
      console.error("Erro ao buscar situações:", error);
    }
  };


  const fetchFuncaoBySearch = async (search: string) => {
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/dados-empresas`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          search,
          descricaoSecao: selectedSection.join(","), // Filtra pelas seções selecionadas
        },
      });

      const data = response.data.dados as Array<{ NOME_FUNCAO: string }>;
      const uniqueFuncoes = Array.from(
        new Set(data.map((item) => item.NOME_FUNCAO.trim()))
      ).sort();

      setFilteredFuncoes(uniqueFuncoes);
    } catch (error) {
      console.error("Erro ao buscar funções por pesquisa:", error);
    }
  };

  const fetchSections = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/dados-empresas`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: { page: 1, perPage: 50 }, // Carrega até 50 registros por vez
      });

      const data = response.data.dados as Array<{ DESCRICAO_SECAO: string }>;

      const uniqueSections = Array.from(
        new Set(data.map((item) => item.DESCRICAO_SECAO.trim()))
      ).sort();

      setSections(uniqueSections);
      setFilteredSections(uniqueSections);
    } catch (error) {
      console.error("Erro ao buscar seções:", error);
    }
  };

  const fetchSectionBySearch = async (search: string) => {
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/dados-empresas`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: { search },
      });

      const data = response.data.dados as Array<{ DESCRICAO_SECAO: string }>;
      const uniqueSections = Array.from(
        new Set(data.map((item) => item.DESCRICAO_SECAO.trim()))
      ).sort();

      setFilteredSections(uniqueSections);
    } catch (error) {
      console.error("Erro ao buscar seções por pesquisa:", error);
    }
  };

  useEffect(() => {
    fetchSections();
    fetchFuncoes();
  }, []);

  useEffect(() => {
    if (selectedSection.length > 0 || selectedSituacao.length > 0) {
      fetchFuncoes(); // Carrega funções com base nos filtros aplicados
    } else {
      setFilteredFuncoes([]); // Limpa as funções se nenhum filtro estiver aplicado
    }
  }, [selectedSection, selectedSituacao]); // Depende de `selectedSection` e `selectedSituacao`

  useEffect(() => {
    fetchSituacoes(); // Busca todas as situações ao montar o componente
  }, []);



  const [dashboardData, setDashboardData] = useState<any[]>([]);
  const [funcoesData, setFuncoesData] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    sexo: "",
    nomeFuncionario: "",
    valorMin: "",
    valorMax: "",
    mesAno: "",
    codigoSituacao: "",
    descricaoSecao: "",
    nomeFuncao: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  //const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [recordsPerPage, setRecordsPerPage] = useState<string>("10"); // Alterado para string



  const navigate = useNavigate(); // Hook para navegação

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [field]: value,
    }));
  };

  const handleLogout = () => {
    localStorage.clear(); // Limpa o armazenamento local
    navigate("/"); // Redireciona para a página de login
  };

  const fetchDashboardData = async () => {
    const token = localStorage.getItem("token");
    setIsLoading(true);
    setErrorMessage("");

    try {
      const params = {
        ...filters,
        mesAno: filters.mesAno
          ? `${filters.mesAno.split("-")[1]}/${filters.mesAno.split("-")[0]}`
          : undefined, // Formata o MesAno para MM/YYYY
      };

      const response = await axios.get("http://127.0.0.1:8000/api/dados-empresas", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
      });

      const dados = response.data.dados || [];

      console.log("Retorno do backend:", dados);

      if (dados.length === 0) {
        setErrorMessage("Nenhum dado encontrado para os filtros aplicados.");
        setDashboardData([]);
        setFuncoesData([]);
        setFuncionarios([]);
        return;
      }

      // Paginação
      const startIndex = (currentPage - 1) * parseInt(recordsPerPage);
      const paginatedData = dados.slice(startIndex, startIndex + parseInt(recordsPerPage));
      setFuncionarios(paginatedData);

      setTotalPages(Math.ceil(dados.length / parseInt(recordsPerPage, 10)));

      if (filters.descricaoSecao) {
        // Agrupamento por CODCOLIGADA quando houver filtros de seção
        const groupedData = dados.reduce((acc: any, curr: any) => {
          const coligadaIndex = acc.findIndex(
            (item: any) => item.CODCOLIGADA === curr.CODCOLIGADA
          );

          if (coligadaIndex >= 0) {
            acc[coligadaIndex].totalFuncionarios += 1;
            acc[coligadaIndex].totalFaturado += parseFloat(curr.VALOR_TOTAL || 0);
            acc[coligadaIndex].totalMasculino += curr.SEXO === "M" ? 1 : 0;
            acc[coligadaIndex].totalFeminino += curr.SEXO === "F" ? 1 : 0;
          } else {
            acc.push({
              CODCOLIGADA: curr.CODCOLIGADA,
              totalFuncionarios: 1,
              totalFaturado: parseFloat(curr.VALOR_TOTAL || 0),
              totalMasculino: curr.SEXO === "M" ? 1 : 0,
              totalFeminino: curr.SEXO === "F" ? 1 : 0,
            });
          }

          return acc;
        }, []);

        setDashboardData(groupedData);
      } else {
        // Sem filtros de seção, visão geral
        const totalFuncionarios = dados.length;
        const totalFaturado = dados.reduce(
          (acc: number, curr: any) => acc + parseFloat(curr.VALOR_TOTAL || "0"),
          0
        );

        const totalMasculino = dados.filter((item: any) => item.SEXO === "M").length;
        const totalFeminino = dados.filter((item: any) => item.SEXO === "F").length;

        setDashboardData([
          {
            totalFuncionarios,
            totalFaturado,
            totalMasculino,
            totalFeminino,
          },
        ]);
      }

      // Contagem por função
      const funcoes = dados.reduce((acc: any, curr: any) => {
        if (!acc[curr.NOME_FUNCAO]) {
          acc[curr.NOME_FUNCAO] = 0;
        }
        acc[curr.NOME_FUNCAO]++;
        return acc;
      }, {});

      setFuncoesData(
        Object.entries(funcoes).map(([key, value]) => ({
          NOME_FUNCAO: key,
          totalPorFuncao: value,
        }))
      );
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      setErrorMessage("Erro ao buscar dados. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [filters, currentPage, recordsPerPage]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const barDataFuncionarios = {
    labels: dashboardData.map((item: any) =>
      item.CODCOLIGADA === 1 ? "ETT" : item.CODCOLIGADA === 6 ? "SHIFT" : `Coligada ${item.CODCOLIGADA}`
    ),
    datasets: [
      {
        label: "Masculino",
        data: dashboardData.map((item: any) => item.totalMasculino || 0),
        backgroundColor: "#4B9CD3",
      },
      {
        label: "Feminino",
        data: dashboardData.map((item: any) => item.totalFeminino || 0),
        backgroundColor: "#E87653",
      },
    ],
  };


  const barDataSalario = {
    labels: ["Média Salarial"],
    datasets: [
      {
        label: "Média Salarial",
        data: [dashboardData[0]?.mediaSalario || 0],
        backgroundColor: "#6AA84F",
      },
    ],
  };

  const barDataFuncoes = {
    labels: funcoesData.map((item: any) => item.NOME_FUNCAO),
    datasets: [
      {
        label: "Total por Função",
        data: funcoesData.map((item: any) => item.totalPorFuncao),
        backgroundColor: "#FFA500",
      },
    ],
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  };


  const totalFuncoes = funcoesData.length;

  const exportarDados = async (formato: "csv" | "xlsx") => {
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/exportar-dados-por-empresas?${new URLSearchParams(filters as any)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: formato === "csv" ? "text/csv" : "text/csv", // Retorna sempre CSV
          },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao exportar dados.");
      }

      const csvText = await response.text();

      if (formato === "csv") {
        // Exportação CSV
        const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "dados-empresas.xlsx");
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
      } else if (formato === "xlsx") {
        // Exportação XLSX
        const rows = csvText.split("\n").map((row) => row.split(","));
        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");
        XLSX.writeFile(workbook, "dados-empresas.csv");
      }
    } catch (error) {
      console.error("Erro ao exportar dados:", error);
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* Barra superior com o botão de logout */}
      <div className="flex justify-between items-center bg-white shadow-md p-4 rounded mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard Filtrado</h1>
        <div className="flex items-center gap-4" style={{ marginLeft: "-2rem" }}>
          <a href="https://firstrhgroup.com" target="_blank" rel="noopener noreferrer">
            <img
              src={require("../images/FirstRH_Group_LOGO_SEM FUNDO.png")}
              alt="Logo FirstRH"
              className="h-12 object-contain cursor-pointer" // Adiciona o estilo de cursor para indicar clicável
            />
          </a>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Sair
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Sexo */}
          <div>
            <label className="block mb-1">Sexo:</label>
            <select
              value={filters.sexo}
              onChange={(e) => handleFilterChange("sexo", e.target.value)}
              className="border p-2 rounded w-full"
            >
              <option value="">Todos</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
          </div>

          {/* Código Situação */}
          <div>
            <label className="block mb-1">Situação:</label>
            <Select
              options={situacoes.map((situacao) => ({ value: situacao, label: situacao }))}
              value={selectedSituacao.map((situacao) => ({ value: situacao, label: situacao }))}
              onChange={(selectedOptions) => {
                const selectedValues = selectedOptions.map((option) => option.value);
                setSelectedSituacao(selectedValues);

                // Atualiza o filtro de situação com múltiplos valores
                handleFilterChange("codigoSituacao", selectedValues.join(","));
              }}
              isMulti // Permite múltiplas seleções
              isClearable
              placeholder="Selecione ou pesquise situações"
              className="border p-2 rounded w-full"
            />
          </div>


          {/* Mês/Ano */}
          <div>
            <label className="block mb-1">Mês/Ano:</label>
            <input
              type="month"
              value={filters.mesAno}
              onChange={(e) => handleFilterChange("mesAno", e.target.value)}
              className="border p-2 rounded w-full"
            />
          </div>

          {/* Nome do Funcionário */}
          <div>
            <label className="block mb-1">Nome do Funcionário:</label>
            <input
              type="text"
              value={filters.nomeFuncionario}
              onChange={(e) => handleFilterChange("nomeFuncionario", e.target.value)}
              placeholder="Digite o nome"
              className="border p-2 rounded w-full"
            />
          </div>

          <div>
            <label className="block mb-1">Seção:</label>
            <Select
              options={filteredSections.map((section) => ({
                value: section,
                label: section,
              }))}
              value={selectedSection.map((section) => ({
                value: section,
                label: section,
              }))} // Permite múltiplas seleções
              onInputChange={(inputValue) => {
                if (inputValue.trim()) {
                  fetchSectionBySearch(inputValue); // Realiza a busca no backend ao digitar
                } else {
                  setFilteredSections(sections); // Volta às seções originais se o input estiver vazio
                }
              }}
              onChange={(selectedOptions) => {
                const selectedValues = selectedOptions.map((option) => option.value);
                setSelectedSection(selectedValues); // Atualiza o estado com múltiplas seleções
                handleFilterChange("descricaoSecao", selectedValues.join(",")); // Envia múltiplas seções separadas por vírgulas ao filtro
              }}
              isMulti // Habilita múltiplas seleções
              isClearable
              placeholder="Selecione ou pesquise seções"
              className="border p-2 rounded w-full"
            />
          </div>



          <div>
            <label className="block mb-1">Função:</label>
            <Select
              options={filteredFuncoes.map((funcao) => ({ value: funcao, label: funcao }))}
              value={selectedFuncao.map((funcao) => ({ value: funcao, label: funcao }))}
              onInputChange={(inputValue) => {
                if (inputValue.trim()) {
                  fetchFuncaoBySearch(inputValue); // Realiza a busca no backend
                } else {
                  setFilteredFuncoes(funcoes); // Volta às funções originais se o input estiver vazio
                }
              }}
              onChange={(selectedOptions) => {
                const selectedValues = selectedOptions.map((option) => option.value);
                setSelectedFuncao(selectedValues);

                // Atualiza o filtro de função com múltiplos valores
                handleFilterChange("nomeFuncao", selectedValues.join(","));
              }}
              isMulti // Habilita múltiplas seleções
              isClearable
              placeholder="Selecione ou pesquise funções"
              className="border p-2 rounded w-full"
            />
          </div>





          {/* Valor Mínimo */}
          <div>
            <label className="block mb-1">Valor Faturado Mínimo:</label>
            <input
              type="number"
              value={filters.valorMin}
              onChange={(e) => handleFilterChange("valorMin", e.target.value)}
              placeholder="Digite o valor mínimo"
              className="border p-2 rounded w-full"
            />
          </div>

          {/* Valor Máximo */}
          <div>
            <label className="block mb-1">Valor Faturado Máximo:</label>
            <input
              type="number"
              value={filters.valorMax}
              onChange={(e) => handleFilterChange("valorMax", e.target.value)}
              placeholder="Digite o valor máximo"
              className="border p-2 rounded w-full"
            />
          </div>
        </div>
      </div>

      {/* Mensagem de erro */}
      {errorMessage && (
        <div className="bg-red-100 text-red-800 p-4 rounded mb-6">
          <p>{errorMessage}</p>
        </div>
      )}

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {filters.descricaoSecao ? (
          dashboardData.map((item: any, index: number) => (
            <div
              key={index}
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 rounded-lg shadow-lg"
            >
              <h2 className="text-2xl font-bold text-white mb-4">
                {item.CODCOLIGADA === 1
                  ? "ETT"
                  : item.CODCOLIGADA === 6
                    ? "SHIFT"
                    : item.CODCOLIGADA
                      ? `Coligada ${item.CODCOLIGADA}`
                      : "Carregando Coligada..."}
              </h2>
              <p className="text-white text-lg mb-2">
                Total de Funcionários:{" "}
                <span className="font-bold">{item.totalFuncionarios}</span>
              </p>
              <p className="text-white text-lg">
                Total Faturado:{" "}
                <span className="font-bold">{formatCurrency(item.totalFaturado)}</span>
              </p>
            </div>
          ))
        ) : (
          <>
            <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold text-white">
                Total de Funcionários:{" "}
                <span className="font-bold">{dashboardData[0]?.totalFuncionarios || 0}</span>
              </h2>
            </div>
            <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold text-white">
                Total Faturado:{" "}
                <span className="font-bold">
                  {dashboardData[0]?.totalFaturado
                    ? formatCurrency(dashboardData[0].totalFaturado)
                    : "R$ 0,00"}
                </span>
              </h2>
            </div>
          </>
        )}
      </div>



      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white p-4 rounded-lg shadow-lg w-full flex flex-col items-center justify-center">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Funcionários por Gênero
            </h2>
            <div
              style={{
                height: "400px",
                width: "60%",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Bar data={barDataFuncionarios} options={{ maintainAspectRatio: false }} />
            </div>
          </div>
        </div>


        {/*}  <div className="bg-white p-4 rounded-lg shadow-lg">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Média Salarial</h2>
          <Bar data={barDataSalario} />
        </div> */}
        <div className="bg-white p-4 rounded-lg shadow-lg" style={{ gridColumn: "span 2" }}>
          <h2 className="text-lg font-semibold text-gray-700 mb-4 text-center">Total por Função</h2>
          <div style={{ height: "500px", width: "100%" }}>
            <Bar
              data={barDataFuncoes}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: true,
                    position: "top",
                  },
                },
                scales: {
                  x: {
                    ticks: {
                      display: false, // Desativa os rótulos no eixo X
                    },
                  },
                },
              }}
            />
          </div>
        </div>



      </div>

      {/* Lista de Funcionários */}
      <div className="bg-white p-4 rounded-lg shadow-lg mt-6">
        <h2 className="text-xl font-semibold mb-4">Lista de Funcionários</h2>
        <Menu>
          <Menu.Button className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 24 24"
              className="w-5 h-5"
            >
              <path d="M12 2a2 2 0 00-2 2v1H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2h-6V4a2 2 0 00-2-2zm0 2h6v2h-6V4zm-2.707 7.293l-1.147 1.147 1.147 1.147a1 1 0 11-1.414 1.414L7.707 13.707a1 1 0 010-1.414l1.147-1.147a1 1 0 011.414 1.414zm4.414 0a1 1 0 011.414-1.414l1.147 1.147a1 1 0 010 1.414l-1.147 1.147a1 1 0 11-1.414-1.414l1.147-1.147z" />
            </svg>
            Exportar
          </Menu.Button>
          <Menu.Items className="absolute left-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
            <Menu.Item>
              {({ active }) => (
                <button
                  className={`block w-full px-4 py-2 text-left ${active ? "bg-gray-100" : ""
                    }`}
                  onClick={() => exportarDados("csv")}
                >
                  Exportar como CSV
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  className={`block w-full px-4 py-2 text-left ${active ? "bg-gray-100" : ""
                    }`}
                  onClick={() => exportarDados("xlsx")}
                >
                  Exportar como XLSX
                </button>
              )}
            </Menu.Item>
          </Menu.Items>
        </Menu>


        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2">Chapa</th>
              <th className="border border-gray-300 p-2 text-center">Situação</th> {/* Nova Coluna */}
              <th className="border border-gray-300 p-2">Nome</th>
              <th className="border border-gray-300 p-2">Sexo</th>
              <th className="border border-gray-300 p-2 text-center">Data de Admissão</th>
              <th className="border border-gray-300 p-2">Função</th>
              <th className="border border-gray-300 p-2">Seção</th>
              <th className="border border-gray-300 p-2 text-center">Valor Faturado</th>
              <th className="border border-gray-300 p-2 text-center">Mês/Ano</th>
              <th className="border border-gray-300 p-2">Prazo Contrato</th> {/* Nova Coluna */}
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={8} // Certifique-se de usar o mesmo número de colunas da tabela
                  className="py-4 text-blue-600 font-semibold text-center align-middle"
                  style={{
                    verticalAlign: "middle",
                  }}
                >
                  Carregando funcionários, por favor aguarde...
                </td>
              </tr>
            ) : funcionarios.length > 0 ? (
              funcionarios.map((funcionario, index) => (
                <tr key={`${funcionario.CHAPA}-${index}`}>
                  <td className="border border-gray-300 p-2">{funcionario.CHAPA}</td>
                  <td className="border border-gray-300 p-2 text-center">{funcionario.CODIGOSITACAO || "N/A"}</td> {/* Nova Coluna */}
                  <td className="border border-gray-300 p-2">{funcionario.NOME_FUNCIONARIO}</td>
                  <td className="border border-gray-300 p-2 text-center">{funcionario.SEXO}</td>
                  <td className="border border-gray-300 p-2 text-center">
                    {funcionario.DATAADMISSAO
                      ? new Date(funcionario.DATAADMISSAO).toLocaleDateString("pt-BR")
                      : "N/A"}
                  </td>
                  <td className="border border-gray-300 p-2">{funcionario.NOME_FUNCAO}</td>
                  <td className="border border-gray-300 p-2">{funcionario.DESCRICAO_SECAO}</td>
                  <td className="border border-gray-300 p-2 text-center">
                    {funcionario.VALOR_TOTAL && !isNaN(parseFloat(funcionario.VALOR_TOTAL))
                      ? parseFloat(funcionario.VALOR_TOTAL).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })
                      : "R$ 0,00"}
                  </td>
                  <td className="border border-gray-300 p-2 text-center">{funcionario.MesAno}</td>
                  <td className="border border-gray-300 p-2 text-center">
                    {funcionario.PRAZO_CONTRATO ? formatDate(funcionario.PRAZO_CONTRATO) : "Não informado"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={8} // Certifique-se de usar o mesmo número de colunas da tabela
                  className="py-4 text-red-600 font-semibold text-center align-middle"
                  style={{
                    verticalAlign: "middle",
                  }}
                >
                  Nenhum funcionário encontrado.
                </td>
              </tr>
            )}
          </tbody>



        </table>

        {/* Paginação e Registros por Página */}
        <div className="flex flex-col items-center mt-4">
          <div className="flex items-center gap-4 mb-2">
            <label htmlFor="recordsPerPage" className="text-gray-700 font-medium">
              Registros por página:
            </label>
            <input
              id="recordsPerPage"
              type="number"
              value={recordsPerPage === "" ? "" : recordsPerPage} // Permite que o campo fique vazio
              onChange={(e) => {
                const value = e.target.value;
                if (value === "") {
                  setRecordsPerPage(""); // Permite que o campo fique vazio
                } else if (parseInt(value, 10) > 0) {
                  setRecordsPerPage(value); // Atualiza o valor se válido
                } else {
                  setRecordsPerPage("1"); // Restabelece para 1 se inválido
                }
                setCurrentPage(1); // Resetando para a primeira página sempre que alterar
              }}
              onFocus={(e) => e.target.select()} // Seleciona o conteúdo ao focar
              className="w-16 p-2 border rounded"
            />
          </div>



          <div className="flex justify-center items-center">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              className={`px-4 py-2 rounded-lg font-semibold ${currentPage === 1
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600"
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
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600"
                }`}
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardFiltered;
