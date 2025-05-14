import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import React, { useEffect, useState, useRef } from "react";
import { Bar } from "react-chartjs-2";
import { FaSpinner } from "react-icons/fa"; // Ícone de spinner
import { FaCircleNotch } from "react-icons/fa";
import axios from "axios";
import { Menu } from "@headlessui/react";
import Select from "react-select";
import * as XLSX from "xlsx";

import { useLocation } from "react-router-dom";
import firstRHLogo from "../images/FirstRH_Group_LOGO_SEM FUNDO.png";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface DashboardProps {
  coligadaId?: number;
}

const Dashboard: React.FC<DashboardProps> = ({ coligadaId }) => {
  const [funcoes, setFuncoes] = useState<string[]>([]); // Todas as funções
  const [filteredFuncoes, setFilteredFuncoes] = useState<string[]>([]); // Funções filtradas
  const [selectedFuncao, setSelectedFuncao] = useState<string[]>([]);
  const [selectedSituacao, setSelectedSituacao] = useState<string[]>([]); // Situações selecionadas
  const [situacoes, setSituacoes] = useState<string[]>([]); // Todas as situações disponíveis
  const [filteredSituacoes, setFilteredSituacoes] = useState<string[]>([]); // Situações filtradas com base no sexo

  const [page, setPage] = useState(1); // Página atual para paginação
  const [hasMore, setHasMore] = useState(true); // Controle para verificar se há mais dados para carregar

  const location = useLocation(); // Declare `location` no início
  const [dashboardData, setDashboardData] = useState<any>([]);
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
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [showNoDataModal, setShowNoDataModal] = useState(false);
  const [recordsPerPage, setRecordsPerPage] = useState<string>("10");

  const chartRef = useRef(null);
  const resizeChart = () => {
    if (chartRef.current && (chartRef.current as any).resize) {
      (chartRef.current as any).resize();
    }
  };

  const [sections, setSections] = useState<string[]>([]); // Estado para armazenar as seções
  const [filteredSections, setFilteredSections] = useState<string[]>([]); // Seções filtradas para exibição
  const [selectedSection, setSelectedSection] = useState<string[]>([]); // Múltiplas seções selecionadas

  // ESTADO LOCAL PARA CONTROLAR A DIGITAÇÃO DO NOME:
  const [nomeFuncionarioLocal, setNomeFuncionarioLocal] = useState("");

  // =============== INÍCIO DAS FUNÇÕES DE BUSCA ===============

  const fetchFuncoes = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get(
        `http://127.0.0.1:8000/api/dados-empresas`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            page: 1,
            perPage: 15,
            descricaoSecao: selectedSection.join(","), // Passa as seções selecionadas como filtro
            codigoSituacao: selectedSituacao.join(","),
          },
        }
      );

      const data = response.data.dados as Array<{ NOME_FUNCAO: string }>;

      console.log("Funções retornadas do backend:", data);

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
      const response = await axios.get(
        `http://127.0.0.1:8000/api/dados-empresas`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            // Opcional: adicionar filtros, se necessário
          },
        }
      );

      const data = response.data.dados as Array<{ CODIGOSITACAO: string | null }>;

      const uniqueSituacoes = Array.from(
        new Set(
          data
            .map((item) => (item.CODIGOSITACAO ? item.CODIGOSITACAO.trim() : ""))
            .filter((situacao) => situacao !== "") // Remove strings vazias
        )
      ).sort();

      setSituacoes(uniqueSituacoes);
      setFilteredSituacoes(uniqueSituacoes); // Inicializa as situações filtradas
    } catch (error) {
      console.error("Erro ao buscar situações:", error);
    }
  };

  // Atualiza as situações filtradas com base no sexo selecionado
  useEffect(() => {
    if (filters.sexo === "M") {
      // Remove "LICENÇA MATERNIDADE" se o sexo for "MASCULINO"
      const filtered = situacoes.filter(
        (situacao) => situacao !== "LICENÇA MATERNIDADE"
      );
      setFilteredSituacoes(filtered);

      // Remove "LICENÇA MATERNIDADE" das situações selecionadas, se estiver presente
      if (selectedSituacao.includes("LICENÇA MATERNIDADE")) {
        setSelectedSituacao((prev) =>
          prev.filter((situacao) => situacao !== "LICENÇA MATERNIDADE")
        );
        handleFilterChange(
          "codigoSituacao",
          selectedSituacao.filter((situacao) => situacao !== "LICENÇA MATERNIDADE").join(",")
        );
      }
    } else {
      // Restaura todas as situações disponíveis
      setFilteredSituacoes(situacoes);
    }
  }, [filters.sexo, situacoes]);

  const fetchFuncaoBySearch = async (search: string) => {
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get(
        `http://127.0.0.1:8000/api/dados-empresas`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            search,
            descricaoSecao: selectedSection.join(","), // Passa as seções selecionadas como filtro
          },
        }
      );

      const data = response.data.dados as Array<{ NOME_FUNCAO: string }>;

      console.log("Funções retornadas pela pesquisa:", data);

      const uniqueFuncoes = Array.from(
        new Set(data.map((item) => item.NOME_FUNCAO.trim()))
      ).sort();

      setFilteredFuncoes(uniqueFuncoes);
    } catch (error) {
      console.error("Erro ao buscar funções por pesquisa:", error);
    }
  };

  const fetchSections = async (append = false) => {
    const token = localStorage.getItem("token");

    try {
      const response = await axios.get(
        `http://127.0.0.1:8000/api/funcionarios`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            page,
            perPage: 50, // Carregar 50 seções por vez
          },
        }
      );

      const data = response.data.data as Array<{ DESCRICAO_SECAO: string }>;

      const uniqueSections = Array.from(
        new Set(data.map((item) => item.DESCRICAO_SECAO.trim()))
      ).sort();

      if (append) {
        setSections((prevSections) => [...prevSections, ...uniqueSections]);
        setFilteredSections((prevSections) => [
          ...prevSections,
          ...uniqueSections,
        ]);
      } else {
        setSections(uniqueSections);
        setFilteredSections(uniqueSections);
      }

      if (response.data.meta.current_page >= response.data.meta.last_page) {
        setHasMore(false);
      } else {
        setPage((prevPage) => prevPage + 1);
      }
    } catch (error) {
      console.error("Erro ao buscar seções:", error);
    }
  };

  const fetchSectionBySearch = async (search: string) => {
    const token = localStorage.getItem("token");
    try {
      // Atualiza o estado para mostrar a mensagem "Carregando..."
      setFilteredSections(["Carregando..."]);

      const response = await axios.get(
        `http://127.0.0.1:8000/api/funcionarios`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            search, // Passa o termo pesquisado para o backend
            perPage: 100, // Garante que busque mais registros
          },
        }
      );

      const data = response.data.data as Array<{
        CHAPA: string;
        DESCRICAO_SECAO: string;
      }>;

      console.log("Dados retornados do backend:", data);

      // Remove duplicatas com base em CHAPA
      const uniqueData = Array.from(
        new Map(data.map((item) => [item.CHAPA, item])).values()
      );

      console.log("Dados após remoção de duplicatas:", uniqueData);

      const uniqueSections: string[] = Array.from(
        new Set(uniqueData.map((item) => item.DESCRICAO_SECAO.trim()))
      ).sort();

      console.log("Seções únicas filtradas:", uniqueSections);

      if (uniqueSections.length === 0) {
        console.warn("Nenhuma seção encontrada para o termo pesquisado.");
        setFilteredSections(["Nenhuma seção encontrada"]);
        return;
      }

      setFilteredSections(uniqueSections); // Atualiza as seções filtradas
    } catch (error) {
      console.error("Erro ao buscar seções por pesquisa:", error);
      // Exibe uma mensagem de erro ao usuário em caso de falha
      setFilteredSections(["Erro ao buscar seções"]);
    }
  };

  // =============== FIM DAS FUNÇÕES DE BUSCA ===============

  // BUSCA DE SITUAÇÕES
  useEffect(() => {
    fetchSituacoes(); // Carrega situações ao montar o componente
  }, []);

  // BUSCA DE SEÇÕES
  useEffect(() => {
    fetchSections(); // Carrega todas as seções ao montar o componente
  }, []);

  // QUANDO mudam seções ou situações selecionadas, recarregamos funções
  useEffect(() => {
    if (selectedSection.length > 0 || selectedSituacao.length > 0) {
      fetchFuncoes(); // Recarrega funções com base nos filtros
    } else {
      setFilteredFuncoes([]); // Limpa as funções se nenhum filtro estiver aplicado
    }
  }, [selectedSection, selectedSituacao]);

  useEffect(() => {
    window.addEventListener("resize", resizeChart);
    return () => {
      window.removeEventListener("resize", resizeChart);
    };
  }, []);

  // FUNÇÃO QUE ATUALIZA O OBJETO DE FILTROS
  const handleFilterChange = (field: string, value: string | string[]) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [field]: Array.isArray(value) ? value.join(",") : value,
    }));
    setCurrentPage(1);
  };

  // DEBOUNCE: toda vez que "nomeFuncionarioLocal" mudar, esperamos 500ms
  // antes de atualizar de fato o filtro global (que faz a requisição).
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      handleFilterChange("nomeFuncionario", nomeFuncionarioLocal);
    }, 2500);

    return () => {
      clearTimeout(debounceTimer);
    };
  }, [nomeFuncionarioLocal]);

  // BUSCA DE DADOS DO DASHBOARD
  const fetchDashboardData = async () => {
    const token = localStorage.getItem("token");
    setIsDashboardLoading(true);
    try {
      const params = {
        ...filters,
        mesAno: filters.mesAno
          ? `${filters.mesAno.split("-")[1]}/${filters.mesAno.split("-")[0]}`
          : undefined,
      };

      const response = await axios.get(
        `http://127.0.0.1:8000/api/dashboard${coligadaId ? `/${coligadaId}` : ""
        }`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params,
        }
      );

      if (response.data.dashboard.length === 0) {
        setShowNoDataModal(true);
      } else {
        setShowNoDataModal(false);
      }

      setDashboardData(response.data.dashboard);
      setFuncoesData(response.data.funcoes);
    } catch (error) {
      console.error("Erro ao obter dados do dashboard", error);
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        alert("Acesso negado. Faça login novamente.");
        localStorage.removeItem("token");
        window.location.href = "/";
      }
    } finally {
      setIsDashboardLoading(false);
    }
  };

  // BUSCA DE FUNCIONÁRIOS (LISTA)
  const fetchFuncionarios = async (page: number, pageSize?: number) => {
    const token = localStorage.getItem("token");
    setIsLoading(true);

    let codColigada: number | null = null;

    if (location.pathname === "/dashboard/ett") {
      codColigada = 1;
    } else if (location.pathname === "/dashboard/first") {
      codColigada = 6;
    }

    try {
      const params = {
        page,
        pageSize,
        ...filters,
        mesAno: filters.mesAno
          ? `${filters.mesAno.split("-")[1]}/${filters.mesAno.split("-")[0]}`
          : undefined,
      };

      const response = await axios.get(
        codColigada
          ? `http://127.0.0.1:8000/api/funcionarios/${codColigada}`
          : `http://127.0.0.1:8000/api/funcionarios`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params,
        }
      );

      console.log("Funcionários recebidos:", response.data.data);

      const responseData = response.data.data || [];
      const totalRecords = response.data.meta?.total || 0;

      setFuncionarios(responseData);
      setTotalPages(
        Math.ceil(totalRecords / (pageSize || parseInt(recordsPerPage)))
      );
    } catch (error) {
      console.error("Erro ao buscar funcionários", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Dispara a busca do dashboard quando coligada ou filtros mudam
  useEffect(() => {
    fetchDashboardData();
  }, [coligadaId, filters]);

  // Dispara a busca dos funcionários quando página, registrosPorPágina ou filtros mudam
  useEffect(() => {
    fetchFuncionarios(currentPage, parseInt(recordsPerPage));
    console.log("Página Atual:", currentPage);
    console.log("Total de Páginas:", totalPages);
  }, [currentPage, recordsPerPage, filters, location.pathname]);

  useEffect(() => {
    console.log("Seções carregadas:", sections);
  }, [sections]);

  const formatNumber = (value: number) =>
    new Intl.NumberFormat("pt-BR").format(value);
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  };

  const coligadas = dashboardData.map((item: any) =>
    item.CODCOLIGADA === 1
      ? "ETT"
      : item.CODCOLIGADA === 6
        ? "SHIFT"
        : `Coligada ${item.CODCOLIGADA}`
  );

  const barDataFuncoes = {
    labels: Array.isArray(funcoesData)
      ? funcoesData.map((item: any) => item.NOME_FUNCAO)
      : [],
    datasets: [
      {
        label: "Total por Função",
        data: Array.isArray(funcoesData)
          ? funcoesData.map((item: any) => item.totalPorFuncao)
          : [],
        backgroundColor: "#FFA500",
      },
    ],
  };

  const handleRecordsPerPageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    // Apenas atualiza o estado se o valor for um número positivo ou vazio
    if (value === "" || /^[1-9]\d*$/.test(value)) {
      setRecordsPerPage(value);
    }
  };

  const barDataFuncionarios = {
    labels: dashboardData.map((item: any) =>
      item.CODCOLIGADA === 1
        ? "ETT"
        : item.CODCOLIGADA === 6
          ? "SHIFT"
          : `Coligada ${item.CODCOLIGADA}`
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
    labels: coligadas,
    datasets: [
      {
        label: "Média Salarial",
        data: dashboardData.map((item: any) => item.mediaSalario),
        backgroundColor: "#6AA84F",
      },
    ],
  };

  let dashboardTitle = "Dashboard Corporativo";
  if (location.pathname === "/dashboard/ett") {
    dashboardTitle += " - ETT";
  } else if (location.pathname === "/dashboard/first") {
    dashboardTitle += " - SHIFT";
  }

  const exportarFuncionarios = async (formato: "csv" | "xlsx") => {
    try {
      const token = localStorage.getItem("token");

      const params: Record<string, string> = {
        descricaoSecao: filters.descricaoSecao || "",
        nomeFuncao: filters.nomeFuncao || "",
        sexo: filters.sexo || "",
        nomeFuncionario: filters.nomeFuncionario || "",
        valorMin: filters.valorMin || "",
        valorMax: filters.valorMax || "",
        mesAno: filters.mesAno
          ? `${filters.mesAno.split("-")[1]}/${filters.mesAno.split("-")[0]}`
          : "",
      };

      const queryString = new URLSearchParams(params).toString();

      const response = await fetch(
        `http://127.0.0.1:8000/api/exportar-funcionarios?${queryString}&formato=${formato}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: formato === "csv" ? "text/csv" : "text/csv",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Erro ao exportar funcionários como ${formato.toUpperCase()}.`
        );
      }

      const csvText = await response.text();

      if (formato === "csv") {
        const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "funcionarios.csv");
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
      } else if (formato === "xlsx") {
        const rows = csvText.split("\n").map((row) => row.split(","));
        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Funcionários");
        XLSX.writeFile(workbook, "funcionarios.xlsx");
      }
    } catch (error) {
      console.error(
        `Erro ao exportar funcionários como ${formato.toUpperCase()}:`,
        error
      );
      alert(
        `Erro ao exportar funcionários como ${formato.toUpperCase()}. Tente novamente.`
      );
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen relative">
      {isDashboardLoading ? (
        <div className="flex flex-col items-center justify-center h-screen">
          <FaCircleNotch className="animate-spin text-4xl text-blue-500 mb-4" />
          <p className="text-lg font-medium text-gray-600">
            Carregando dados, por favor aguarde...
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-800">
              {dashboardTitle}
            </h1>
            <img
              src={firstRHLogo}
              alt="Logo First RH Group"
              className="h-auto"
              style={{
                width: "15rem",
                borderRadius: "8px",
                marginTop: "-10px",
              }}
            />
          </div>

          {showNoDataModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
              <div className="bg-white p-6 rounded shadow-lg w-96">
                <h2 className="text-lg font-bold text-red-600 mb-4">
                  Nenhum dado encontrado
                </h2>
                <p className="text-gray-700 mb-4">
                  Não foram encontrados dados para os filtros aplicados.
                </p>
                <button
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  onClick={() => setShowNoDataModal(false)}
                >
                  Fechar
                </button>
              </div>
            </div>
          )}

          <div className="bg-white p-4 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4">Filtros</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Seção - Agora vem primeiro */}
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
                  }))}
                  onInputChange={(inputValue) => {
                    if (inputValue.trim()) {
                      fetchSectionBySearch(inputValue);
                    } else {
                      setFilteredSections(sections);
                    }
                  }}
                  onChange={(selectedOptions) => {
                    const selectedValues = selectedOptions.map(
                      (option) => option.value
                    );
                    setSelectedSection(selectedValues);
                    handleFilterChange("descricaoSecao", selectedValues.join(","));
                  }}
                  isMulti
                  isClearable
                  placeholder="Selecione ou pesquise seções"
                  className="border p-2 rounded w-full"
                  noOptionsMessage={() => "Carregando..."}
                />
              </div>

              {/* Mês/Ano - Agora vem depois de Seção */}
              <div>
                <label className="block mb-1">Mês/Ano:</label>
                <input
                  type="month"
                  value={filters.mesAno}
                  onChange={(e) => handleFilterChange("mesAno", e.target.value)}
                  className="border p-2 rounded w-full"
                />
              </div>

              {/* Situação - Agora vem no lugar de Mês/Ano */}
              <div>
                <label className="block mb-1">Situação:</label>
                <Select
                  options={filteredSituacoes.map((situacao) => ({
                    value: situacao,
                    label: situacao,
                  }))}
                  value={selectedSituacao.map((situacao) => ({
                    value: situacao,
                    label: situacao,
                  }))}
                  onChange={(selectedOptions) => {
                    const selectedValues = selectedOptions.map(
                      (option) => option.value
                    );
                    setSelectedSituacao(selectedValues);
                    handleFilterChange("codigoSituacao", selectedValues.join(","));
                  }}
                  isMulti
                  isClearable
                  placeholder="Selecione ou pesquise situações"
                  className="border p-2 rounded w-full"
                />
              </div>

              {/* Nome do Funcionário - Mantém sua posição */}
              <div>
                <label className="block mb-1">Nome do Funcionário:</label>
                <input
                  type="text"
                  value={nomeFuncionarioLocal}
                  onChange={(e) => setNomeFuncionarioLocal(e.target.value)}
                  placeholder="Digite o nome"
                  className="border p-2 rounded w-full"
                />
              </div>

              {/* Função - Agora vem no lugar de Seção */}
              <div>
                <label className="block mb-1">Função:</label>
                <Select
                  options={filteredFuncoes.map((funcao) => ({
                    value: funcao,
                    label: funcao,
                  }))}
                  value={selectedFuncao.map((funcao) => ({
                    value: funcao,
                    label: funcao,
                  }))}
                  onInputChange={(inputValue) => {
                    if (inputValue.trim()) {
                      fetchFuncaoBySearch(inputValue);
                    } else {
                      setFilteredFuncoes(funcoes);
                    }
                  }}
                  onChange={(selectedOptions) => {
                    const selectedValues = selectedOptions.map(
                      (option) => option.value
                    );
                    setSelectedFuncao(selectedValues);
                    handleFilterChange("nomeFuncao", selectedValues.join(","));
                  }}
                  isMulti
                  isClearable
                  placeholder="Selecione ou pesquise funções"
                  className="border p-2 rounded w-full"
                />
              </div>

              {/* Sexo - Agora vem no lugar de Função */}
              <div>
                <label className="block mb-1">Sexo:</label>
                <select
                  value={filters.sexo}
                  onChange={(e) => {
                    handleFilterChange("sexo", e.target.value);
                  }}
                  className="border p-2 rounded w-full"
                >
                  <option value="">Todos</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>
            </div>
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {dashboardData.map((item: any, index: number) => (
              <div
                key={index}
                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 rounded-lg shadow-lg"
              >
                <h2 className="text-2xl font-bold text-white mb-4">
                  {item.CODCOLIGADA === 1
                    ? "ETT"
                    : item.CODCOLIGADA === 6
                      ? "SHIFT"
                      : `Coligada ${item.CODCOLIGADA}`}
                </h2>
                <p className="text-white text-lg mb-2">
                  Total de Funcionários:{" "}
                  <span className="font-bold">{formatNumber(item.totalFuncionarios)}</span>
                </p>
                <p className="text-white text-lg">
                  Total Folha de Salários:{" "}
                  <span className="font-bold">{formatCurrency(item.totalFolhaSalarios)}</span>
                </p>
              </div>
            ))}
          </div>


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
                <Bar
                  data={barDataFuncionarios}
                  options={{ maintainAspectRatio: false }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-lg mt-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Total por Função
            </h2>
            <div
              className="relative"
              style={{
                height: "400px",
                width: "100%",
                overflow: "hidden",
              }}
            >
              <Bar
                ref={chartRef}
                data={{
                  labels: funcoesData.map((item: any) => item.NOME_FUNCAO),
                  datasets: [
                    {
                      label: "Total por Função",
                      data: funcoesData.map(
                        (item: any) => item.totalPorFuncao
                      ),
                      backgroundColor: "#FFA500",
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: true, position: "top" },
                    tooltip: {
                      callbacks: {
                        label: (context: any) =>
                          `${context.label}: ${context.raw}`,
                      },
                    },
                  },
                  scales: {
                    x: { ticks: { display: false }, grid: { display: false } },
                    y: { beginAtZero: true },
                  },
                }}
              />
            </div>
          </div>

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
                      onClick={() => exportarFuncionarios("csv")}
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
                      onClick={() => exportarFuncionarios("xlsx")}
                    >
                      Exportar como XLSX
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Menu>

            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-300 p-2">CHAPA</th>
                  <th className="border border-gray-300 p-2 text-center">
                    Situação
                  </th>
                  <th className="border border-gray-300 p-2">Nome</th>
                  <th className="border border-gray-300 p-2">CPF</th>
                  <th className="border border-gray-300 p-2 text-center">
                    Sexo
                  </th>
                  <th className="border border-gray-300 p-2 text-center">
                    Data de Admissão
                  </th>
                  <th className="border border-gray-300 p-2">Função</th>
                  <th className="border border-gray-300 p-2">Seção</th>
                  <th className="border border-gray-300 p-2 text-center">
                    Valor Faturado
                  </th>
                  <th className="border border-gray-300 p-2 text-center">
                    Mês/Ano
                  </th>
                  <th className="border border-gray-300 p-2">
                    Prazo do Contrato
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="text-center py-4 text-blue-600 font-semibold"
                    >
                      Carregando funcionários, por favor aguarde...
                    </td>
                  </tr>
                ) : funcionarios.length > 0 ? (
                  funcionarios.map((funcionario) => (
                    <tr key={`${funcionario.CHAPA}-${funcionario.MesAno}`}>
                      <td className="border border-gray-300 p-2">
                        {funcionario.CHAPA}
                      </td>
                      <td className="border border-gray-300 p-2 text-center">
                        {funcionario.CODIGOSITACAO || "N/A"}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {funcionario.NOME_FUNCIONARIO}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {funcionario.CPF}
                      </td>
                      <td className="border border-gray-300 p-2 text-center">
                        {funcionario.SEXO}
                      </td>
                      <td className="border border-gray-300 p-2 text-center">
                        {formatDate(funcionario.DATAADMISSAO)}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {funcionario.NOME_FUNCAO}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {funcionario.DESCRICAO_SECAO}
                      </td>
                      <td className="border border-gray-300 p-2 text-center">
                        {formatCurrency(funcionario.VALOR)}
                      </td>
                      <td className="border border-gray-300 p-2 text-center">
                        {funcionario.MesAno || "N/A"}
                      </td>
                      <td className="border border-gray-300 p-2 text-center">
                        {funcionario.PRAZO_CONTRATO
                          ? formatDate(funcionario.PRAZO_CONTRATO)
                          : "Não informado"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      className="text-center py-4 text-red-600 font-semibold"
                    >
                      Nenhum funcionário encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="flex flex-col items-center mt-4">
              <div className="flex items-center gap-4 mb-2">
                <label
                  htmlFor="recordsPerPage"
                  className="text-gray-700 font-medium"
                >
                  Registros por página:
                </label>
                <input
                  id="recordsPerPage"
                  type="number"
                  value={recordsPerPage || ""}
                  onChange={handleRecordsPerPageChange}
                  onFocus={(e) => e.target.select()}
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
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  className={`px-4 py-2 rounded-lg font-semibold ${currentPage === totalPages || totalPages === 0
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;