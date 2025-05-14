import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import Select from 'react-select';
import { Pie, Bar } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';
import { useParams, useNavigate } from 'react-router-dom';
import firstRHLogo from "../images/FirstRH_Group_LOGO_SEM FUNDO.png";
import InputMask from 'react-input-mask';
import moment from 'moment';

// Registro dos componentes do Chart.js
Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

interface Employee {
  CODCOLIGADA: number;
  CHAPA: string;
  NOME_FUNCIONARIO: string;
  SEXO: string;
  DATAADMISSAO: string;
  CODIGOSITACAO: string;
  VALOR_TOTAL: string;
  NOME_FUNCAO: string;
  DESCRICAO_SECAO: string;
  TIPO_DE_CONTRATADO: string;
  PRAZO_CONTRATO_180_DIAS: string;
  PRAZO_CONTRATO_270_DIAS: string;
  DATA_DEMISSAO: string | null;
  GESTOR?: string;
  CENTRO_CUSTO?: string;
}

interface DashboardAggregates {
  totalFuncionarios: number;
  totalFolhaSalarios: number;
}

interface AppliedFilters {
  selectedClients: { value: string; label: string }[];
  selectedFunctions: { value: string; label: string }[];
  selectedSituations: { value: string; label: string }[];
  mesAno: string;
  nomeFuncionario: string;
  sexo: string;
  prazo180Range?: { from: string; to: string };
  prazo270Range?: { from: string; to: string };
  dataAdmissaoRange?: { from: string; to: string };
  dataDemissaoRange?: { from: string; to: string };
}

interface CodColigadaSummary {
  totalFuncionarios: number;
  totalSalarios: number;
}

// Funções de formatação
const formatCurrency = (value: string): string => {
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDateBR = (dateString: string | null): string => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
};

const formatNumber = (num: number): string => {
  return num.toLocaleString('pt-BR');
};

const formatDateInput = (value: string): string => {
  if (value && !value.includes('/') && value.length === 8) {
    return value.slice(0, 2) + '/' + value.slice(2, 4) + '/' + value.slice(4);
  }
  return value;
};

// Monta os parâmetros de consulta a partir dos filtros
const buildQueryParams = (
  sexo: string,
  nomeFuncionario: string,
  selectedSituations: { value: string; label: string }[],
  selectedClients: { value: string; label: string }[],
  selectedFunctions: { value: string; label: string }[],
  mesAno: string,
  prazo180Range?: { from: string; to: string },
  prazo270Range?: { from: string; to: string },
  dataAdmissaoRange?: { from: string; to: string },
  dataDemissaoRange?: { from: string; to: string }
): string => {
  const params = new URLSearchParams();
  if (sexo) params.append('sexo', sexo);
  if (nomeFuncionario) params.append('nomeFuncionario', nomeFuncionario);
  if (selectedSituations.length > 0) {
    params.append('codigoSituacao', selectedSituations.map(s => s.value).join(','));
  }
  if (selectedClients.length > 0) {
    params.append('descricaoSecao', selectedClients.map(c => c.value).join(','));
  }
  if (selectedFunctions.length > 0) {
    params.append('nomeFuncao', selectedFunctions.map(f => f.value).join(','));
  }
  if (mesAno) params.append('mesAno', mesAno);
  if (prazo180Range && prazo180Range.from && prazo180Range.to) {
    params.append('prazo180Range', `${prazo180Range.from}-${prazo180Range.to}`);
  }
  if (prazo270Range && prazo270Range.from && prazo270Range.to) {
    params.append('prazo270Range', `${prazo270Range.from}-${prazo270Range.to}`);
  }
  if (dataAdmissaoRange && dataAdmissaoRange.from && dataAdmissaoRange.to) {
    params.append('dataAdmissaoRange', `${dataAdmissaoRange.from}-${dataAdmissaoRange.to}`);
  }
  if (dataDemissaoRange && dataDemissaoRange.from && dataDemissaoRange.to) {
    params.append('dataDemissaoRange', `${dataDemissaoRange.from}-${dataDemissaoRange.to}`);
  }
  return params.toString();
};

// Spinner simples com Tailwind CSS
const Spinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-screen">
    <div className="flex items-center space-x-4">
      <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
      <span className="text-xl font-semibold text-gray-700">Carregando...</span>
    </div>
  </div>
);


// Componente Principal: DashboardPagesFiltrado
const DashboardPagesFiltrado: React.FC = () => {
  const [token, setToken] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [aggregates, setAggregates] = useState<DashboardAggregates>({ totalFuncionarios: 0, totalFolhaSalarios: 0 });

  const [genderChartData, setGenderChartData] = useState<any>(null);
  const [rawFunctionsChartData, setRawFunctionsChartData] = useState<any>(null);

  const [selectedClients, setSelectedClients] = useState<{ value: string; label: string }[]>([]);
  const [selectedFunctions, setSelectedFunctions] = useState<{ value: string; label: string }[]>([]);
  const [mesAno, setMesAno] = useState<string>('');
  const [nomeFuncionario, setNomeFuncionario] = useState<string>('');
  const [sexo, setSexo] = useState<string>('');

  const [selectedSituations, setSelectedSituations] = useState<{ value: string; label: string }[]>([]);

  const [showPrazo180Filter, setShowPrazo180Filter] = useState(false);
  const [prazo180From, setPrazo180From] = useState('');
  const [prazo180To, setPrazo180To] = useState('');

  const [showPrazo270Filter, setShowPrazo270Filter] = useState(false);
  const [prazo270From, setPrazo270From] = useState('');
  const [prazo270To, setPrazo270To] = useState('');

  const [showDataAdmissaoFilter, setShowDataAdmissaoFilter] = useState(false);
  const [dataAdmissaoFrom, setDataAdmissaoFrom] = useState('');
  const [dataAdmissaoTo, setDataAdmissaoTo] = useState('');

  const [showDataDemissaoFilter, setShowDataDemissaoFilter] = useState(false);
  const [dataDemissaoFrom, setDataDemissaoFrom] = useState('');
  const [dataDemissaoTo, setDataDemissaoTo] = useState('');

  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({
    selectedClients: [],
    selectedFunctions: [],
    selectedSituations: [],
    mesAno: '',
    nomeFuncionario: '',
    sexo: '',
    prazo180Range: undefined,
    prazo270Range: undefined,
    dataAdmissaoRange: undefined,
    dataDemissaoRange: undefined,
  });

  const [allClientOptions, setAllClientOptions] = useState<{ value: string; label: string }[]>([]);
  const [allFunctionOptions, setAllFunctionOptions] = useState<{ value: string; label: string }[]>([]);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [recordsPerPageInput, setRecordsPerPageInput] = useState<string>("10");

  const [currentFunctionPage, setCurrentFunctionPage] = useState<number>(1);
  const chartPageSize = 15;

  const [exportDropdownOpen, setExportDropdownOpen] = useState<boolean>(false);

  const [codColigadasSummary, setCodColigadasSummary] = useState<Record<number, CodColigadaSummary>>({});

  const { type } = useParams<{ type?: string }>();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken);
    } else {
      navigate("/login");
    }
  }, [navigate]);

  // Função para exportar dados
  const exportarDados = async (formato: "csv" | "xlsx") => {
    const tokenLocal = localStorage.getItem("token");
    if (!tokenLocal) {
      alert("Token não encontrado. Faça login novamente.");
      return;
    }

    // → exportarDados (trecho ajustado)
    const filtersExport = {
      descricaoSecao: selectedClients.map(c => c.value).join(','),
      nomeFuncao: selectedFunctions.map(f => f.value).join(','),
      sexo: sexo,
      nomeFuncionario: nomeFuncionario,
      mesAno: mesAno,
      prazo180Range: prazo180From && prazo180To ? `${prazo180From}-${prazo180To}` : "",
      prazo270Range: prazo270From && prazo270To ? `${prazo270From}-${prazo270To}` : "",
      codigoSituacao: selectedSituations.map(s => s.value).join(','),
      // ─────── aqui ───────
      dataAdmissaoRange: dataAdmissaoFrom && dataAdmissaoTo
        ? `${dataAdmissaoFrom}-${dataAdmissaoTo}`
        : ""
    };


    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/exportar-dados-por-empresas?${new URLSearchParams(filtersExport as any)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${tokenLocal}`,
            Accept: "text/csv"
          },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao exportar dados.");
      }

      const csvText = await response.text();

      if (formato === "csv") {
        const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "dados-empresas.csv"); // Agora sim, .csv
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
      } else if (formato === "xlsx") {
        const rows = csvText.split("\n").map(row => row.split(","));
        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");
        XLSX.writeFile(workbook, "dados-empresas.xlsx"); // Agora sim, .xlsx
      }
    } catch (error) {
      console.error("Erro ao exportar dados:", error);
      alert("Erro ao exportar dados. Verifique o console para mais detalhes.");
    }
  };

  const fetchDadosEmpresas = async (filters: AppliedFilters) => {
    if (!token) return;
    setLoading(true);
    try {
      const queryParams = buildQueryParams(
        filters.sexo,
        filters.nomeFuncionario,
        filters.selectedSituations,
        filters.selectedClients,
        filters.selectedFunctions,
        filters.mesAno,
        filters.prazo180Range,
        filters.prazo270Range,
        filters.dataAdmissaoRange,
        filters.dataDemissaoRange
      );
      console.log('Query Params enviada ao backend:', queryParams);
      const url = queryParams
        ? `http://127.0.0.1:8000/api/dados-empresas?${queryParams}`
        : 'http://127.0.0.1:8000/api/dados-empresas';
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const json = await response.json();
      if (json.message !== "Dados obtidos com sucesso.") {
        setError(json.message || "Erro ao obter dados.");
        setEmployees([]);
      } else {
        const mappedEmployees = json.dados.map((emp: any) => ({
          ...emp,
          TIPO_DE_CONTRATADO: emp.TIPO_DE_CONTRATADO || "Não informado",
          DATA_DEMISSAO: emp.DATA_DEMISSAO || null,
          GESTOR: emp.GESTOR || "—",
          CENTRO_CUSTO: emp.CENTRO_CUSTO || "—"
        }));
        console.log('Dados retornados do backend:', mappedEmployees);
        setEmployees(mappedEmployees);
      }
    } catch (err) {
      setError('Erro ao buscar dados das empresas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const totalFuncionarios = employees.length;
    const totalFolhaSalarios = employees.reduce((acc, emp) => acc + parseFloat(emp.VALOR_TOTAL), 0);
    setAggregates({ totalFuncionarios, totalFolhaSalarios });

    const masculino = employees.filter(emp => emp.SEXO.toUpperCase() === 'M').length;
    const feminino = employees.filter(emp => emp.SEXO.toUpperCase() === 'F').length;
    setGenderChartData({
      labels: ['Masculino', 'Feminino'],
      datasets: [
        {
          data: [masculino, feminino],
          backgroundColor: ['#4b9cd3', '#e87653']
        }
      ]
    });

    const functionsMap: { [key: string]: number } = {};
    employees.forEach(emp => {
      const key = emp.NOME_FUNCAO.toUpperCase();
      functionsMap[key] = (functionsMap[key] || 0) + 1;
    });
    const funcLabels = Object.keys(functionsMap);
    const funcTotals = Object.values(functionsMap);
    setRawFunctionsChartData({
      labels: funcLabels,
      datasets: [
        {
          label: 'Total de Funcionários',
          data: funcTotals,
          backgroundColor: '#ffa500'
        }
      ]
    });
    setCurrentFunctionPage(1);

    const summary: Record<number, CodColigadaSummary> = {};
    employees.forEach(emp => {
      const cod = emp.CODCOLIGADA;
      if (!summary[cod]) {
        summary[cod] = {
          totalFuncionarios: 0,
          totalSalarios: 0
        };
      }
      summary[cod].totalFuncionarios += 1;
      summary[cod].totalSalarios += parseFloat(emp.VALOR_TOTAL);
    });
    setCodColigadasSummary(summary);
  }, [employees]);

  const totalPages = Math.ceil(employees.length / pageSize);
  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return employees.slice(startIndex, startIndex + pageSize);
  }, [employees, currentPage, pageSize]);

  const totalFunctionPages = useMemo(() => {
    if (!rawFunctionsChartData) return 0;
    return Math.ceil(rawFunctionsChartData.labels.length / chartPageSize);
  }, [rawFunctionsChartData, chartPageSize]);

  const paginatedFunctionsChartData = useMemo(() => {
    if (!rawFunctionsChartData) return { labels: [], datasets: [] };
    const startIdx = (currentFunctionPage - 1) * chartPageSize;
    const paginatedLabels = rawFunctionsChartData.labels.slice(startIdx, startIdx + chartPageSize);
    const paginatedTotals = rawFunctionsChartData.datasets[0].data.slice(startIdx, startIdx + chartPageSize);
    return {
      labels: paginatedLabels,
      datasets: [
        {
          label: 'Total de Funcionários',
          data: paginatedTotals,
          backgroundColor: '#ffa500'
        }
      ]
    };
  }, [rawFunctionsChartData, currentFunctionPage, chartPageSize]);

  const fetchAllClientOptions = async () => {
    if (!token) return;
    try {
      const response = await fetch('http://127.0.0.1:8000/api/dados-empresas', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const json = await response.json();
      if (json.message === "Dados obtidos com sucesso." && json.dados) {
        const clientes = json.dados.map((emp: Employee) => emp.DESCRICAO_SECAO);
        const uniqueClientes = Array.from(new Set(clientes)) as string[];
        const options = uniqueClientes.map((c: string) => ({ value: c, label: c }));
        setAllClientOptions(options);
      }
    } catch (err) {
      console.error('Erro ao buscar opções de clientes', err);
    }
  };

  const breakdownETT = useMemo(() => {
    const result: Record<string, number> = {};
    employees
      .filter(emp => emp.CODCOLIGADA === 1)
      .forEach(emp => {
        const situacao = emp.CODIGOSITACAO;
        result[situacao] = (result[situacao] || 0) + 1;
      });
    return result;
  }, [employees]);

  const breakdownSHIFT = useMemo(() => {
    const result: Record<string, number> = {};
    employees
      .filter(emp => emp.CODCOLIGADA === 6)
      .forEach(emp => {
        const situacao = emp.CODIGOSITACAO;
        result[situacao] = (result[situacao] || 0) + 1;
      });
    return result;
  }, [employees]);

  const fetchAllFunctionOptions = async () => {
    if (!token) return;
    try {
      const response = await fetch('http://127.0.0.1:8000/api/dados-empresas', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const json = await response.json();
      if (json.message === "Dados obtidos com sucesso." && json.dados) {
        const funcoes = json.dados.map((emp: Employee) => emp.NOME_FUNCAO);
        const uniqueFuncoes = Array.from(new Set(funcoes)) as string[];
        const options = uniqueFuncoes.map((f: string) => ({ value: f, label: f }));
        setAllFunctionOptions(options);
      }
    } catch (err) {
      console.error('Erro ao buscar opções de funções', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAllClientOptions();
      fetchAllFunctionOptions();
      fetchDadosEmpresas(appliedFilters);
    }
  }, [token, appliedFilters]);

  const handleRecordsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRecordsPerPageInput(e.target.value);
  };

  const handleRecordsPerPageBlur = () => {
    const value = parseInt(recordsPerPageInput, 10);
    if (!isNaN(value) && value > 0) {
      setPageSize(value);
      setCurrentPage(1);
    } else {
      setRecordsPerPageInput(pageSize.toString());
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const value = parseInt(recordsPerPageInput, 10);
      if (!isNaN(value) && value > 0 && value !== pageSize) {
        setPageSize(value);
        setCurrentPage(1);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [recordsPerPageInput, pageSize]);

  const handlePrazo180FromBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value && !moment(value, 'DD/MM/YYYY', true).isValid()) {
      alert('Data inválida. Por favor, insira uma data no formato DD/MM/YYYY.');
      setPrazo180From('');
    } else {
      setPrazo180From(value);
    }
  };

  const handlePrazo180ToBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value && !moment(value, 'DD/MM/YYYY', true).isValid()) {
      alert('Data inválida. Por favor, insira uma data no formato DD/MM/YYYY.');
      setPrazo180To('');
    } else {
      setPrazo180To(value);
    }
  };

  const handlePrazo270FromBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value && !moment(value, 'DD/MM/YYYY', true).isValid()) {
      alert('Data inválida. Por favor, insira uma data no formato DD/MM/YYYY.');
      setPrazo270From('');
    } else {
      setPrazo270From(value);
    }
  };

  const handlePrazo270ToBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value && !moment(value, 'DD/MM/YYYY', true).isValid()) {
      alert('Data inválida. Por favor, insira uma data no formato DD/MM/YYYY.');
      setPrazo270To('');
    } else {
      setPrazo270To(value);
    }
  };

  const handleDataAdmissaoFromBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value && !moment(value, 'DD/MM/YYYY', true).isValid()) {
      alert('Data inválida. Por favor, insira uma data no formato DD/MM/YYYY.');
      setDataAdmissaoFrom('');
    } else {
      setDataAdmissaoFrom(value);
    }
  };

  const handleDataAdmissaoToBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value && !moment(value, 'DD/MM/YYYY', true).isValid()) {
      alert('Data inválida. Por favor, insira uma data no formato DD/MM/YYYY.');
      setDataAdmissaoTo('');
    } else {
      setDataAdmissaoTo(value);
    }
  };

  const handleDataDemissaoFromBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value && !moment(value, 'DD/MM/YYYY', true).isValid()) {
      alert('Data inválida. Por favor, insira uma data no formato DD/MM/YYYY.');
      setDataDemissaoFrom('');
    } else {
      setDataDemissaoFrom(value);
    }
  };

  const handleDataDemissaoToBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value && !moment(value, 'DD/MM/YYYY', true).isValid()) {
      alert('Data inválida. Por favor, insira uma data no formato DD/MM/YYYY.');
      setDataDemissaoTo('');
    } else {
      setDataDemissaoTo(value);
    }
  };

  const handleFilterSubmit = (e: FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setAppliedFilters({
      sexo,
      nomeFuncionario,
      selectedSituations,
      selectedClients,
      selectedFunctions,
      mesAno,
      prazo180Range: (prazo180From && prazo180To) ? { from: prazo180From, to: prazo180To } : undefined,
      prazo270Range: (prazo270From && prazo270To) ? { from: prazo270From, to: prazo270To } : undefined,
      dataAdmissaoRange: (dataAdmissaoFrom && dataAdmissaoTo) ? { from: dataAdmissaoFrom, to: dataAdmissaoTo } : undefined,
      dataDemissaoRange: (dataDemissaoFrom && dataDemissaoTo) ? { from: dataDemissaoFrom, to: dataDemissaoTo } : undefined,
    });
  };

  const handleMesAnoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '');
    raw = raw.slice(0, 6);
    let formatted = raw;
    if (raw.length > 2) {
      formatted = raw.slice(0, 2) + '/' + raw.slice(2);
    }
    setMesAno(formatted);
  };

  const handleMesAnoBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length !== 7) {
      setMesAno('');
      return;
    }
    const [month, year] = value.split('/');
    const monthInt = parseInt(month, 10);
    const yearInt = parseInt(year, 10);
    const currentYear = new Date().getFullYear();

    if (monthInt < 1 || monthInt > 12) {
      alert("Mês inválido. Informe um mês entre 01 e 12.");
      setMesAno('');
      return;
    }
    if (yearInt > currentYear) {
      alert("Ano inválido. Informe um ano menor ou igual a " + currentYear + ".");
      setMesAno('');
      return;
    }
  };

  const handleFunctionChartPrevPage = () => {
    if (currentFunctionPage > 1) setCurrentFunctionPage(currentFunctionPage - 1);
  };

  const handleFunctionChartNextPage = () => {
    if (currentFunctionPage < totalFunctionPages) setCurrentFunctionPage(currentFunctionPage + 1);
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="w-full p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard Filtrado</h1>
        <div className="flex items-center space-x-4">
          <img
            src={firstRHLogo}
            alt="Logo First RH Group"
            className="h-auto"
            style={{ width: "15rem", borderRadius: "8px", marginTop: "-10px" }}
          />
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Sair
          </button>
        </div>
      </div>

      <form onSubmit={handleFilterSubmit} className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block mb-1 font-semibold">Cliente</label>
          <Select
            isMulti
            options={allClientOptions}
            value={selectedClients}
            onChange={(value) => setSelectedClients(value as { value: string; label: string }[])}
            placeholder="Selecione ou pesquise..."
          />
        </div>
        <div>
          <label className="block mb-1 font-semibold">Situação</label>
          <Select
            isMulti
            options={[
              { value: 'AF.AC.TRABALHO', label: 'AF.AC.TRABALHO' },
              { value: 'AF.PREVIDÊNCIA', label: 'AF.PREVIDÊNCIA' },
              { value: 'APOS. POR INCAPACIDADE PERMANENTE', label: 'APOS. POR INCAPACIDADE PERMANENTE' },
              { value: 'ATIVO', label: 'ATIVO' },
              { value: 'DEMITIDO', label: 'DEMITIDO' },
              { value: 'FÉRIAS', label: 'FÉRIAS' }
            ]}
            value={selectedSituations}
            onChange={(value) => setSelectedSituations(value as { value: string; label: string }[])}
            placeholder="Selecione ou pesquise..."
          />
        </div>
        <div>
          <label className="block mb-1 font-semibold">Nome do Funcionário</label>
          <input
            type="text"
            value={nomeFuncionario}
            onChange={(e) => setNomeFuncionario(e.target.value)}
            className="w-full border border-gray-300 rounded p-2"
            placeholder="Digite o nome do funcionário"
          />
        </div>
        <div>
          <label className="block mb-1 font-semibold">Função</label>
          <Select
            isMulti
            options={allFunctionOptions}
            value={selectedFunctions}
            onChange={(value) => setSelectedFunctions(value as { value: string; label: string }[])}
            placeholder="Selecione ou pesquise..."
          />
        </div>
        <div>
          <label className="block mb-1 font-semibold">Sexo</label>
          <select
            value={sexo}
            onChange={(e) => setSexo(e.target.value)}
            className="w-full border border-gray-300 rounded p-2"
          >
            <option value="">Selecione</option>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </select>
        </div>
        <button
          type="submit"
          className="mt-4 w-fit bg-blue-500 hover:bg-blue-600 text-white py-2 px-2 text-sm rounded"
        >
          Aplicar Filtros
        </button>
      </form>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      <div className="flex flex-wrap gap-6 mb-6">
        {codColigadasSummary[1] && codColigadasSummary[1].totalFuncionarios > 0 && (
          <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 rounded-lg shadow-lg flex-1 min-w-[300px]">
            <h2 className="text-2xl font-bold text-white mb-4">ETT</h2>
            <p className="text-white text-lg">Funcionários: <span className="font-bold">{formatNumber(codColigadasSummary[1].totalFuncionarios)}</span></p>
            <p className="text-white text-lg">Total Salários: <span className="font-bold">{formatCurrency(codColigadasSummary[1].totalSalarios.toString())}</span></p>
            {(appliedFilters.mesAno.trim() !== "" || appliedFilters.selectedSituations.length > 0) && (
              <>
                {Object.entries(breakdownETT).map(([situacao, count]) => (
                  <p key={situacao} className="text-white text-lg">
                    {situacao[0].toUpperCase() + situacao.slice(1).toLowerCase()}: <span className="font-bold">{formatNumber(Number(count))}</span>
                  </p>
                ))}
              </>
            )}
          </div>
        )}
        {codColigadasSummary[6] && codColigadasSummary[6].totalFuncionarios > 0 && (
          <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 rounded-lg shadow-lg flex-1 min-w-[300px]">
            <h2 className="text-2xl font-bold text-white mb-4">SHIFT</h2>
            <p className="text-white text-lg">Funcionários: <span className="font-bold">{formatNumber(codColigadasSummary[6].totalFuncionarios)}</span></p>
            <p className="text-white text-lg">Total Salários: <span className="font-bold">{formatCurrency(codColigadasSummary[6].totalSalarios.toString())}</span></p>
            {(appliedFilters.mesAno.trim() !== "" || appliedFilters.selectedSituations.length > 0) && (
              <>
                {Object.entries(breakdownSHIFT).map(([situacao, count]) => (
                  <p key={situacao} className="text-white text-lg">
                    {situacao[0].toUpperCase() + situacao.slice(1).toLowerCase()}: <span className="font-bold">{formatNumber(Number(count))}</span>
                  </p>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {genderChartData && (
        <div className="bg-white p-4 rounded-lg shadow-lg w-full flex flex-col items-center justify-center mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Distribuição por Gênero</h2>
          <div
            style={{
              height: "400px",
              width: "60%",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Bar
              data={genderChartData}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
              }}
            />
          </div>
          <div className="flex items-center space-x-4 mt-2">
            <div className="flex items-center">
              <span className="w-4 h-4 inline-block mr-2" style={{ backgroundColor: "#4b9cd3" }}></span>
              <span className="text-gray-700">Masculino</span>
            </div>
            <div className="flex items-center">
              <span className="w-4 h-4 inline-block mr-2" style={{ backgroundColor: "#e87653" }}></span>
              <span className="text-gray-700">Feminino</span>
            </div>
          </div>
        </div>
      )}

      {rawFunctionsChartData && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Distribuição por Função</h2>
          <div className="bg-white shadow rounded p-6 w-full mb-6">
            <div className="w-full" style={{ height: '400px' }}>
              <Bar
                data={paginatedFunctionsChartData}
                options={{ maintainAspectRatio: false, plugins: { legend: { display: true, position: 'top' } } }}
              />
            </div>
            <div className="flex justify-center items-center mt-4 space-x-4">
              <button
                onClick={handleFunctionChartPrevPage}
                disabled={currentFunctionPage === 1}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="mx-4 text-lg font-medium text-gray-700">
                Página {currentFunctionPage} de {totalFunctionPages}
              </span>
              <button
                onClick={handleFunctionChartNextPage}
                disabled={currentFunctionPage === totalFunctionPages || totalFunctionPages === 0}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end mb-4">
        <button
          onClick={() => setExportDropdownOpen(prev => !prev)}
          className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded inline-flex items-center"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h3a1 1 0 010 2H5v10h2a1 1 0 110 2H4a1 1 0 01-1-1V4z" />
            <path d="M13 7a1 1 0 00-1 1v4H8a1 1 0 100 2h4a1 1 0 001-1V8a1 1 0 00-1-1z" />
          </svg>
          <span className="ml-2">Exportar</span>
        </button>
        {exportDropdownOpen && (
          <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded shadow-lg">
            <button
              onClick={() => exportarDados("csv")}
              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
            >
              Exportar CSV
            </button>
            <button
              onClick={() => exportarDados("xlsx")}
              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
            >
              Exportar XLSX
            </button>
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg shadow-lg mt-6">
        <h2 className="text-xl font-semibold mb-4">Lista de Funcionários</h2>
        {employees.length === 0 ? (
          <p className="text-center py-4 text-blue-600 font-semibold">Nenhum funcionário encontrado.</p>
        ) : (
          <table className="table-fixed w-full text-xs border-collapse border border-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="border border-gray-300 p-2 w-[8%]">SITUAÇÃO</th>
                <th className="border border-gray-300 p-2 w-[12%]">NOME</th>
                <th className="border border-gray-300 p-2 w-[5%] text-center">SEXO</th>
                <th className="border border-gray-300 p-2 w-[12%]">FUNÇÃO</th>
                <th className="border border-gray-300 p-2 w-[10%]">SALÁRIO</th>
                <th className="border border-gray-300 p-2 w-[10%]">CLIENTE</th>
                <th className="border border-gray-300 p-2 w-[10%]">TIPO DE CONTRATAÇÃO</th>
                <th className="border border-gray-300 p-2 w-[10%] relative">
                  <div className="flex items-center justify-between">
                    <span>DATA DE ADMISSÃO</span>
                    <button onClick={() => setShowDataAdmissaoFilter(prev => !prev)} className="focus:outline-none">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  {showDataAdmissaoFilter && (
                    <div className="absolute z-10 bg-white border border-gray-300 p-2 mt-1 w-full">
                      <InputMask
                        mask="99/99/9999"
                        placeholder="De (DD/MM/YYYY)"
                        value={dataAdmissaoFrom}
                        onChange={(e) => setDataAdmissaoFrom(e.target.value)}
                        onBlur={handleDataAdmissaoFromBlur}
                        className="w-full mb-1 border border-gray-300 rounded p-1 text-xs"
                      />
                      <InputMask
                        mask="99/99/9999"
                        placeholder="Até (DD/MM/YYYY)"
                        value={dataAdmissaoTo}
                        onChange={(e) => setDataAdmissaoTo(e.target.value)}
                        onBlur={handleDataAdmissaoToBlur}
                        className="w-full mb-1 border border-gray-300 rounded p-1 text-xs"
                      />
                      <button
                        onClick={() => {
                          const newDataAdmissaoRange = (dataAdmissaoFrom && dataAdmissaoTo)
                            ? { from: dataAdmissaoFrom, to: dataAdmissaoTo }
                            : undefined;
                          const updatedFilters = {
                            ...appliedFilters,
                            dataAdmissaoRange: newDataAdmissaoRange
                          };
                          console.log('Filtros aplicados (DATA DE ADMISSÃO):', updatedFilters);
                          setAppliedFilters(updatedFilters);
                          fetchDadosEmpresas(updatedFilters);
                          setShowDataAdmissaoFilter(false);
                        }}
                        className="w-full bg-blue-500 text-white text-xs py-1 rounded"
                      >
                        Aplicar
                      </button>
                    </div>
                  )}
                </th>
                <th className="border border-gray-300 p-2 w-[8%] relative">
                  <div className="flex items-center justify-between">
                    <span>PRAZO 180 DIAS</span>
                    <button onClick={() => setShowPrazo180Filter(prev => !prev)} className="focus:outline-none">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  {showPrazo180Filter && (
                    <div className="absolute z-10 bg-white border border-gray-300 p-2 mt-1 w-full">
                      <InputMask
                        mask="99/99/9999"
                        placeholder="De (DD/MM/YYYY)"
                        value={prazo180From}
                        onChange={(e) => setPrazo180From(e.target.value)}
                        onBlur={handlePrazo180FromBlur}
                        className="w-full mb-1 border border-gray-300 rounded p-1 text-xs"
                      />
                      <InputMask
                        mask="99/99/9999"
                        placeholder="Até (DD/MM/YYYY)"
                        value={prazo180To}
                        onChange={(e) => setPrazo180To(e.target.value)}
                        onBlur={handlePrazo180ToBlur}
                        className="w-full mb-1 border border-gray-300 rounded p-1 text-xs"
                      />
                      <button
                        onClick={() => {
                          const newPrazo180Range = (prazo180From && prazo180To)
                            ? { from: prazo180From, to: prazo180To }
                            : undefined;
                          const updatedFilters = {
                            ...appliedFilters,
                            prazo180Range: newPrazo180Range
                          };
                          setAppliedFilters(updatedFilters);
                          fetchDadosEmpresas(updatedFilters);
                          setShowPrazo180Filter(false);
                        }}
                        className="w-full bg-blue-500 text-white text-xs py-1 rounded"
                      >
                        Aplicar
                      </button>
                    </div>
                  )}
                </th>
                <th className="border border-gray-300 p-2 w-[8%] relative">
                  <div className="flex items-center justify-between">
                    <span>PRAZO 270 DIAS</span>
                    <button onClick={() => setShowPrazo270Filter(prev => !prev)} className="focus:outline-none">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  {showPrazo270Filter && (
                    <div className="absolute z-10 bg-white border border-gray-300 p-2 mt-1 w-full">
                      <InputMask
                        mask="99/99/9999"
                        placeholder="De (DD/MM/YYYY)"
                        value={prazo270From}
                        onChange={(e) => setPrazo270From(e.target.value)}
                        onBlur={handlePrazo270FromBlur}
                        className="w-full mb-1 border border-gray-300 rounded p-1 text-xs"
                      />
                      <InputMask
                        mask="99/99/9999"
                        placeholder="Até (DD/MM/YYYY)"
                        value={prazo270To}
                        onChange={(e) => setPrazo270To(e.target.value)}
                        onBlur={handlePrazo270ToBlur}
                        className="w-full mb-1 border border-gray-300 rounded p-1 text-xs"
                      />
                      <button
                        onClick={() => {
                          const newPrazo270Range = (prazo270From && prazo270To)
                            ? { from: prazo270From, to: prazo270To }
                            : undefined;
                          const updatedFilters = {
                            ...appliedFilters,
                            prazo270Range: newPrazo270Range
                          };
                          setAppliedFilters(updatedFilters);
                          fetchDadosEmpresas(updatedFilters);
                          setShowPrazo270Filter(false);
                        }}
                        className="w-full bg-blue-500 text-white text-xs py-1 rounded"
                      >
                        Aplicar
                      </button>
                    </div>
                  )}
                </th>
                <th className="border border-gray-300 p-2 w-[10%] relative">
                  <div className="flex items-center justify-between">
                    <span>DATA DE DEMISSÃO</span>
                    <button onClick={() => setShowDataDemissaoFilter(prev => !prev)} className="focus:outline-none">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  {showDataDemissaoFilter && (
                    <div className="absolute z-10 bg-white border border-gray-300 p-2 mt-1 w-full">
                      <InputMask
                        mask="99/99/9999"
                        placeholder="De (DD/MM/YYYY)"
                        value={dataDemissaoFrom}
                        onChange={(e) => setDataDemissaoFrom(e.target.value)}
                        onBlur={handleDataDemissaoFromBlur}
                        className="w-full mb-1 border border-gray-300 rounded p-1 text-xs"
                      />
                      <InputMask
                        mask="99/99/9999"
                        placeholder="Até (DD/MM/YYYY)"
                        value={dataDemissaoTo}
                        onChange={(e) => setDataDemissaoTo(e.target.value)}
                        onBlur={handleDataDemissaoToBlur}
                        className="w-full mb-1 border border-gray-300 rounded p-1 text-xs"
                      />
                      <button
                        onClick={() => {
                          const newDataDemissaoRange = (dataDemissaoFrom && dataDemissaoTo)
                            ? { from: dataDemissaoFrom, to: dataDemissaoTo }
                            : undefined;
                          const updatedFilters = {
                            ...appliedFilters,
                            dataDemissaoRange: newDataDemissaoRange
                          };
                          console.log('Filtros aplicados (DATA DE DEMISSÃO):', updatedFilters);
                          setAppliedFilters(updatedFilters);
                          fetchDadosEmpresas(updatedFilters);
                          setShowDataDemissaoFilter(false);
                        }}
                        className="w-full bg-blue-500 text-white text-xs py-1 rounded"
                      >
                        Aplicar
                      </button>
                    </div>
                  )}
                </th>
                <th className="border border-gray-300 p-2 w-[10%]">GESTOR</th>
                <th className="border border-gray-300 p-2 w-[10%]">CENTRO DE CUSTO</th>
              </tr>
            </thead>
            <tbody>
              {paginatedEmployees.map((emp, index) => {
                const prazo180 = emp.PRAZO_CONTRATO_180_DIAS === "INDETERMINADO" ? "INDETER." : emp.PRAZO_CONTRATO_180_DIAS;
                const prazo270 = emp.PRAZO_CONTRATO_270_DIAS === "INDETERMINADO" ? "INDETER." : emp.PRAZO_CONTRATO_270_DIAS;
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-2">{emp.CODIGOSITACAO}</td>
                    <td className="border border-gray-300 p-2">{emp.NOME_FUNCIONARIO}</td>
                    <td className="border border-gray-300 p-2 text-center">{emp.SEXO}</td>
                    <td className="border border-gray-300 p-2">{emp.NOME_FUNCAO}</td>
                    <td className="border border-gray-300 p-2 text-right">{formatCurrency(emp.VALOR_TOTAL)}</td>
                    <td className="border border-gray-300 p-2">{emp.DESCRICAO_SECAO}</td>
                    <td className="border border-gray-300 p-2">{emp.TIPO_DE_CONTRATADO}</td>
                    <td className="border border-gray-300 p-2 text-center">{emp.DATAADMISSAO}</td>
                    <td className="border border-gray-300 p-2 text-center">{prazo180}</td>
                    <td className="border border-gray-300 p-2 text-center">{prazo270}</td>
                    <td className="border border-gray-300 p-2 text-center">{formatDateBR(emp.DATA_DEMISSAO)}</td>
                    <td className="border border-gray-300 p-2 text-center">{emp.GESTOR}</td>
                    <td className="border border-gray-300 p-2 text-center">{emp.CENTRO_CUSTO}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div className="flex flex-col items-center mt-4">
          <div className="flex items-center gap-4 mb-2">
            <label htmlFor="recordsPerPage" className="text-gray-700 font-medium">
              Registros por página:
            </label>
            <input
              id="recordsPerPage"
              type="number"
              value={recordsPerPageInput}
              onChange={handleRecordsPerPageChange}
              onFocus={(e) => e.target.select()}
              onBlur={handleRecordsPerPageBlur}
              className="w-16 p-2 border rounded"
            />
          </div>
          <div className="flex justify-center items-center">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className={`px-4 py-2 rounded-lg font-semibold ${currentPage === 1 ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-blue-500 text-white hover:bg-blue-600"}`}
            >
              Anterior
            </button>
            <span className="mx-4 text-lg font-medium text-gray-700">
              Página {currentPage} de {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className={`px-4 py-2 rounded-lg font-semibold ${currentPage === totalPages || totalPages === 0 ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-blue-500 text-white hover:bg-blue-600"}`}
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPagesFiltrado;