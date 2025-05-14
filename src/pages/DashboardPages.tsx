import React, { useState, useEffect, useMemo, useRef, FormEvent } from 'react';
import Select from 'react-select';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
} from 'chart.js';
import { useParams, useNavigate } from 'react-router-dom';
import firstRHLogo from "../images/FirstRH_Group_LOGO_SEM FUNDO.png";
import * as XLSX from 'xlsx';
import InputMask from 'react-input-mask';
import moment from 'moment';

// Registro dos componentes do Chart.js
Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

interface DashboardDetail {
  totalCLT: number;
  totalTemporarios: number;
  totalMasculino: number;
  totalFeminino: number;
  totalSalarios: number;
  clientes: Record<string, any>;
  situacoes?: Record<string, number>;
}

interface DashboardData {
  ETT: DashboardDetail;
  SHIFT: DashboardDetail;
}

interface Employee {
  CODCOLIGADA: number;
  CHAPA: string;
  NOME_FUNCIONARIO: string;
  SEXO: string;
  NOME_FUNCAO: string;
  DESCRICAO_SECAO: string;
  DATAADMISSAO: string;
  SALARIO: string;
  CODIGOSITACAO: string;
  DATA_DEMISSAO: string | null;
  TIPO_CONTRATO: string;
  PRAZO_CONTRATO: string;
  PRAZO_CONTRATO_180_DIAS: string;
  PRAZO_CONTRATO_270_DIAS: string;
  GESTOR?: string;
  CENTRO_CUSTO?: string;
}

interface EmployeeMeta {
  total: number;
  current_page: number;
  per_page: number;
  last_page: number;
}

interface PrazoRange {
  from: string;
  to: string;
}

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

const buildQueryParams = (
  sexo: string,
  nomeFuncionario: string,
  selectedSituations: { value: string; label: string }[],
  selectedFunctions: { value: string; label: string }[],
  selectedClients: { value: string; label: string }[],
  mesAno: string,
  forDashboard: boolean = false,
  prazo180Range?: PrazoRange,
  prazo270Range?: PrazoRange,
  dataAdmissaoRange?: PrazoRange,
  dataDemissaoRange?: PrazoRange
): string => {
  const params = new URLSearchParams();
  if (sexo) params.append('sexo', sexo);
  if (nomeFuncionario) params.append('nomeFuncionario', nomeFuncionario);
  if (selectedSituations.length > 0) {
    params.append(forDashboard ? 'situacao' : 'codigoSituacao', selectedSituations.map(s => s.value).join(','));
  }
  if (selectedFunctions.length > 0) {
    params.append('nomeFuncao', selectedFunctions.map(s => s.value).join(','));
  }
  if (selectedClients.length > 0) {
    params.append('descricaoSecao', selectedClients.map(c => c.value).join(','));
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

const Spinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-screen">
    <div className="flex items-center space-x-4">
      <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
      <span className="text-xl font-semibold text-gray-700">Carregando...</span>
    </div>
  </div>
);

const ExportDropdown: React.FC<{ exportarFuncionarios: (formato: "csv" | "xlsx") => void }> = ({ exportarFuncionarios }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded inline-flex items-center"
      >
        <i className="fas fa-download mr-2"></i>
        <span>Exportar</span>
        <svg className="ml-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
        </svg>
      </button>
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1">
            <button
              onClick={() => {
                exportarFuncionarios("csv");
                setDropdownOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Exportar CSV
            </button>
            <button
              onClick={() => {
                exportarFuncionarios("xlsx");
                setDropdownOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Exportar XLSX
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const DashboardPages: React.FC = () => {
  const [token, setToken] = useState<string>('');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeMeta, setEmployeeMeta] = useState<EmployeeMeta | null>(null);
  const [employeeCurrentPage, setEmployeeCurrentPage] = useState<number>(1);
  const [employeePageSize, setEmployeePageSize] = useState<number>(10);
  const [employeesLoading, setEmployeesLoading] = useState<boolean>(false);

  const [recordsPerPageInput, setRecordsPerPageInput] = useState<string>("10");

  const [allClientOptions, setAllClientOptions] = useState<{ value: string; label: string }[]>([]);
  const [allFunctionOptions, setAllFunctionOptions] = useState<{ value: string; label: string }[]>([]);

  const [selectedClients, setSelectedClients] = useState<{ value: string; label: string }[]>([]);
  const [mesAno, setMesAno] = useState<string>('');
  const [nomeFuncionario, setNomeFuncionario] = useState<string>('');
  const [selectedFunctions, setSelectedFunctions] = useState<{ value: string; label: string }[]>([]);
  const [sexo, setSexo] = useState<string>('');
  const [selectedSituations, setSelectedSituations] = useState<{ value: string; label: string }[]>([]);

  const [showPrazo180Filter, setShowPrazo180Filter] = useState(false);
  const [prazo180From, setPrazo180From] = useState('');
  const [prazo180To, setPrazo180To] = useState('');
  const [showPrazo270Filter, setShowPrazo270Filter] = useState(false);
  const [prazo270From, setPrazo270From] = useState('');
  const [prazo270To, setPrazo270To] = useState('');
  const [showDataAdmissaoFilter, setShowDataAdmissaoFilter] = useState(false);
  const [dataAdmissaoFrom, setDataAdmissaoFrom] = useState<string>('');
  const [dataAdmissaoTo, setDataAdmissaoTo] = useState<string>('');
  const [showDataDemissaoFilter, setShowDataDemissaoFilter] = useState(false);
  const [dataDemissaoFrom, setDataDemissaoFrom] = useState<string>('');
  const [dataDemissaoTo, setDataDemissaoTo] = useState<string>('');

  const [appliedFilters, setAppliedFilters] = useState({
    sexo: "",
    nomeFuncionario: "",
    selectedSituations: [] as { value: string; label: string }[],
    selectedFunctions: [] as { value: string; label: string }[],
    selectedClients: [] as { value: string; label: string }[],
    mesAno: "",
    prazo180Range: undefined as PrazoRange | undefined,
    prazo270Range: undefined as PrazoRange | undefined,
    dataAdmissaoRange: undefined as PrazoRange | undefined,
    dataDemissaoRange: undefined as PrazoRange | undefined,
  });

  const [currentPage, setCurrentPage] = useState<number>(1);
  const chartPageSize = 15;

  const { type } = useParams<{ type?: string }>();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
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

  const fetchAllClientOptions = async () => {
    if (!token) return;
    try {
      const response = await fetch('http://127.0.0.1:8000/api/dashboard', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      let clients: string[] = [];
      if (data.ETT && data.ETT.clientes) {
        clients = [...clients, ...Object.keys(data.ETT.clientes)];
      }
      if (data.SHIFT && data.SHIFT.clientes) {
        clients = [...clients, ...Object.keys(data.SHIFT.clientes)];
      }
      const uniqueClients = Array.from(new Set(clients));
      const options = uniqueClients.map(c => ({ value: c, label: c }));
      setAllClientOptions(options);
    } catch (err) {
      console.error('Erro ao buscar opções de clientes', err);
    }
  };

  const fetchDashboardData = async (filters: typeof appliedFilters) => {
    if (!token) return;
    setLoading(true);
    try {
      const queryParams = buildQueryParams(
        filters.sexo,
        filters.nomeFuncionario,
        filters.selectedSituations,
        filters.selectedFunctions,
        filters.selectedClients,
        filters.mesAno,
        true,
        filters.prazo180Range,
        filters.prazo270Range,
        filters.dataAdmissaoRange,
        filters.dataDemissaoRange
      );
      const url = queryParams
        ? `http://127.0.0.1:8000/api/dashboard?${queryParams}`
        : 'http://127.0.0.1:8000/api/dashboard';
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      setError('Erro ao buscar dados do dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const capitalize = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const fetchAllFunctionOptions = async () => {
    if (!token) return;
    try {
      const response = await fetch('http://127.0.0.1:8000/api/dashboard', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      let functionsSet = new Set<string>();
      if (data.ETT && data.ETT.clientes) {
        Object.values(data.ETT.clientes).forEach((cliente: any) => {
          if (cliente.funcoes) {
            Object.keys(cliente.funcoes).forEach(funcaoName => {
              functionsSet.add(funcaoName);
            });
          }
        });
      }
      if (data.SHIFT && data.SHIFT.clientes) {
        Object.values(data.SHIFT.clientes).forEach((cliente: any) => {
          if (cliente.funcoes) {
            Object.keys(cliente.funcoes).forEach(funcaoName => {
              functionsSet.add(funcaoName);
            });
          }
        });
      }
      const options = Array.from(functionsSet).map(fn => ({ value: fn, label: fn }));
      setAllFunctionOptions(options);
    } catch (err) {
      console.error('Erro ao buscar opções de funções', err);
    }
  };

  const fetchEmployees = async (page: number, filters: typeof appliedFilters) => {
    if (!token) return;
    setEmployeesLoading(true);
    const queryParams = buildQueryParams(
      filters.sexo,
      filters.nomeFuncionario,
      filters.selectedSituations,
      filters.selectedFunctions,
      filters.selectedClients,
      filters.mesAno,
      false,
      filters.prazo180Range,
      filters.prazo270Range,
      filters.dataAdmissaoRange,
      filters.dataDemissaoRange
    );
    let url = "";
    if (type === 'ett') {
      url = `http://127.0.0.1:8000/api/funcionarios/1?page=${page}&pageSize=${employeePageSize}`;
    } else if (type === 'shift') {
      url = `http://127.0.0.1:8000/api/funcionarios/6?page=${page}&pageSize=${employeePageSize}`;
    } else {
      url = `http://127.0.0.1:8000/api/funcionarios?page=${page}&pageSize=${employeePageSize}`;
    }
    if (queryParams) url += `&${queryParams}`;
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      const mappedEmployees = data.data.map((emp: any) => ({
        ...emp,
        DATA_DEMISSAO: emp.DATA_DEMISSAO || null,
        GESTOR: emp.GESTOR || "—",
        CENTRO_CUSTO: emp.CENTRO_CUSTO || "—"
      }));
      setEmployees(mappedEmployees);
      setEmployeeMeta(data.meta);
    } catch (err) {
      console.error('Erro ao buscar funcionários', err);
    } finally {
      setEmployeesLoading(false);
    }
  };

  const exportarFuncionarios = async (formato: "csv" | "xlsx") => {
    try {
      const storedToken = localStorage.getItem("token");
      const params: Record<string, string> = {
        descricaoSecao: selectedClients.map(c => c.value).join(',') || "",
        nomeFuncao: selectedFunctions.map(f => f.value).join(',') || "",
        sexo: sexo || "",
        nomeFuncionario: nomeFuncionario || "",
        mesAno: mesAno ? `${mesAno.split("-")[1]}/${mesAno.split("-")[0]}` : "",
        prazo180Range: (prazo180From && prazo180To) ? `${prazo180From}-${prazo180To}` : "",
        prazo270Range: (prazo270From && prazo270To) ? `${prazo270From}-${prazo270To}` : "",
        dataAdmissaoRange: (dataAdmissaoFrom && dataAdmissaoTo) ? `${dataAdmissaoFrom}-${dataAdmissaoTo}` : "" // Adicionado aqui
      };

      if (selectedSituations.length > 0) {
        params.codigoSituacao = selectedSituations.map(s => s.value).join(',');
      }

      const queryString = new URLSearchParams(params).toString();

      const response = await fetch(
        `http://127.0.0.1:8000/api/exportar-funcionarios?${queryString}&formato=${formato}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${storedToken}`,
            Accept: "text/csv; charset=utf-8",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Erro ao exportar funcionários como ${formato.toUpperCase()}.`);
      }

      const buffer = await response.arrayBuffer();
      const decoder = new TextDecoder('utf-8');
      let csvText = decoder.decode(buffer);

      // Remove o BOM se presente (os primeiros 3 bytes: EF BB BF)
      if (csvText.charCodeAt(0) === 0xFEFF) {
        csvText = csvText.slice(1);
      }

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
        const rows = csvText.split("\n").map(row => row.split(";"));
        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Funcionários");
        XLSX.writeFile(workbook, "funcionarios.xlsx");
      }
    } catch (error) {
      console.error(`Erro ao exportar funcionários como ${formato.toUpperCase()}:`, error);
      alert(`Erro ao exportar funcionários como ${formato.toUpperCase()}. Tente novamente.`);
    }
  };


  useEffect(() => {
    if (token) {
      fetchAllClientOptions();
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchAllFunctionOptions();
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchDashboardData({
        sexo: "",
        nomeFuncionario: "",
        selectedSituations: [],
        selectedFunctions: [],
        selectedClients: [],
        mesAno: "",
        prazo180Range: undefined,
        prazo270Range: undefined,
        dataAdmissaoRange: undefined,
        dataDemissaoRange: undefined
      });
    }
  }, [token]);

  useEffect(() => {
    setRecordsPerPageInput(employeePageSize.toString());
  }, [employeePageSize]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const value = parseInt(recordsPerPageInput, 10);
      if (!isNaN(value) && value > 0 && value !== employeePageSize) {
        setEmployeePageSize(value);
        setEmployeeCurrentPage(1);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [recordsPerPageInput, employeePageSize]);

  useEffect(() => {
    if (token) {
      fetchEmployees(employeeCurrentPage, appliedFilters);
    }
  }, [employeeCurrentPage, token, appliedFilters, employeePageSize, type]);

  const totalFuncionariosETT = dashboardData ? dashboardData.ETT.totalCLT + dashboardData.ETT.totalTemporarios : 0;
  const totalSalariosETT = dashboardData ? dashboardData.ETT.totalSalarios : 0;
  const totalFuncionariosSHIFT = dashboardData ? dashboardData.SHIFT.totalCLT + dashboardData.SHIFT.totalTemporarios : 0;
  const totalSalariosSHIFT = dashboardData ? dashboardData.SHIFT.totalSalarios : 0;

  const dataETTChartData = dashboardData
    ? {
      labels: ['Masculino', 'Feminino'],
      datasets: [
        {
          data: [dashboardData.ETT.totalMasculino, dashboardData.ETT.totalFeminino],
          backgroundColor: ['#4b9cd3', '#e87653']
        }
      ]
    }
    : null;

  const dataSHIFTChartData = dashboardData
    ? {
      labels: ['Masculino', 'Feminino'],
      datasets: [
        {
          data: [dashboardData.SHIFT.totalMasculino, dashboardData.SHIFT.totalFeminino],
          backgroundColor: ['#4b9cd3', '#e87653']
        }
      ]
    }
    : null;

  const aggregatedFunctionsData = useMemo(() => {
    const functionsMap: { [key: string]: number } = {};
    if (dashboardData) {
      if (type === 'ett') {
        const data = dashboardData.ETT;
        if (data?.clientes) {
          Object.keys(data.clientes).forEach(clienteName => {
            const clienteObj = data.clientes[clienteName];
            if (clienteObj.funcoes) {
              Object.keys(clienteObj.funcoes).forEach(funcaoName => {
                const funcaoData = clienteObj.funcoes[funcaoName];
                functionsMap[funcaoName] = (functionsMap[funcaoName] || 0) + funcaoData.totalFuncionarios;
              });
            }
          });
        }
      } else if (type === 'shift') {
        const data = dashboardData.SHIFT;
        if (data?.clientes) {
          Object.keys(data.clientes).forEach(clienteName => {
            const clienteObj = data.clientes[clienteName];
            if (clienteObj.funcoes) {
              Object.keys(clienteObj.funcoes).forEach(funcaoName => {
                const funcaoData = clienteObj.funcoes[funcaoName];
                functionsMap[funcaoName] = (functionsMap[funcaoName] || 0) + funcaoData.totalFuncionarios;
              });
            }
          });
        }
      } else {
        (['ETT', 'SHIFT'] as const).forEach(key => {
          const data = dashboardData[key];
          if (data?.clientes) {
            Object.keys(data.clientes).forEach(clienteName => {
              const clienteObj = data.clientes[clienteName];
              if (clienteObj.funcoes) {
                Object.keys(clienteObj.funcoes).forEach(funcaoName => {
                  const funcaoData = clienteObj.funcoes[funcaoName];
                  functionsMap[funcaoName] = (functionsMap[funcaoName] || 0) + funcaoData.totalFuncionarios;
                });
              }
            });
          }
        });
      }
    }
    return functionsMap;
  }, [dashboardData, type]);

  const functionsChartTitle =
    type === 'ett'
      ? 'Distribuição por Função (ETT)'
      : type === 'shift'
        ? 'Distribuição por Função (SHIFT)'
        : 'Distribuição por Função (ETT + SHIFT)';

  const functionLabels = Object.keys(aggregatedFunctionsData);
  const functionTotals = Object.values(aggregatedFunctionsData);

  const totalFunctionPages = Math.ceil(functionLabels.length / chartPageSize);
  const funcStartIndex = (currentPage - 1) * chartPageSize;
  const funcEndIndex = funcStartIndex + chartPageSize;
  const paginatedLabels = functionLabels.slice(funcStartIndex, funcEndIndex);
  const paginatedTotals = functionTotals.slice(funcStartIndex, funcEndIndex);

  const paginatedChartData = {
    labels: paginatedLabels,
    datasets: [
      {
        label: 'Total de Funcionários',
        data: paginatedTotals,
        backgroundColor: '#ffa500'
      }
    ]
  };

  const chartOptions = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const
      }
    }
  };

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

  const getClientType = (clientName: string): 'ETT' | 'SHIFT' | null => {
    if (!dashboardData) return null;
    if (dashboardData.ETT.clientes && Object.keys(dashboardData.ETT.clientes).includes(clientName)) {
      return 'ETT';
    } else if (dashboardData.SHIFT.clientes && Object.keys(dashboardData.SHIFT.clientes).includes(clientName)) {
      return 'SHIFT';
    }
    return null;
  };

  const handleFilterSubmit = (e: FormEvent) => {
    e.preventDefault();


    setAppliedFilters({
      sexo,
      nomeFuncionario,
      selectedSituations,
      selectedFunctions,
      selectedClients,
      mesAno,
      prazo180Range: prazo180From && prazo180To ? { from: prazo180From, to: prazo180To } : undefined,
      prazo270Range: prazo270From && prazo270To ? { from: prazo270From, to: prazo270To } : undefined,
      dataAdmissaoRange: dataAdmissaoFrom && dataAdmissaoTo ? { from: dataAdmissaoFrom, to: dataAdmissaoTo } : undefined,
      dataDemissaoRange: dataDemissaoFrom && dataDemissaoTo ? { from: dataDemissaoFrom, to: dataDemissaoTo } : undefined,
    });
    setEmployeeCurrentPage(1);
    if (token) {
      fetchDashboardData({
        sexo,
        nomeFuncionario,
        selectedSituations,
        selectedFunctions,
        selectedClients,
        mesAno,
        prazo180Range: prazo180From && prazo180To ? { from: prazo180From, to: prazo180To } : undefined,
        prazo270Range: prazo270From && prazo270To ? { from: prazo270From, to: prazo270To } : undefined,
        dataAdmissaoRange: dataAdmissaoFrom && dataAdmissaoTo ? { from: dataAdmissaoFrom, to: dataAdmissaoTo } : undefined,
        dataDemissaoRange: dataDemissaoFrom && dataDemissaoTo ? { from: dataDemissaoFrom, to: dataDemissaoTo } : undefined,
      });
      fetchEmployees(1, {
        sexo,
        nomeFuncionario,
        selectedSituations,
        selectedFunctions,
        selectedClients,
        mesAno,
        prazo180Range: prazo180From && prazo180To ? { from: prazo180From, to: prazo180To } : undefined,
        prazo270Range: prazo270From && prazo270To ? { from: prazo270From, to: prazo270To } : undefined,
        dataAdmissaoRange: dataAdmissaoFrom && dataAdmissaoTo ? { from: dataAdmissaoFrom, to: dataAdmissaoTo } : undefined,
        dataDemissaoRange: dataDemissaoFrom && dataDemissaoTo ? { from: dataDemissaoFrom, to: dataDemissaoTo } : undefined,
      });
    }
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

  const functionOptions = useMemo(() => {
    if (allFunctionOptions.length > 0) {
      return allFunctionOptions;
    }
    if (dashboardData) {
      const functions = Object.keys(aggregatedFunctionsData);
      return functions.map(fn => ({ value: fn, label: fn }));
    }
    return [];
  }, [allFunctionOptions, dashboardData, aggregatedFunctionsData]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalFunctionPages) setCurrentPage(currentPage + 1);
  };

  const handleEmployeePrevPage = () => {
    if (employeeMeta && employeeMeta.current_page > 1) {
      setEmployeeCurrentPage(employeeMeta.current_page - 1);
    }
  };

  const handleEmployeeNextPage = () => {
    if (employeeMeta && employeeMeta.current_page < employeeMeta.last_page) {
      setEmployeeCurrentPage(employeeMeta.current_page + 1);
    }
  };

  const handleRecordsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRecordsPerPageInput(e.target.value);
  };

  const handleRecordsPerPageBlur = () => {
    const value = parseInt(recordsPerPageInput, 10);
    if (!isNaN(value) && value > 0) {
      setEmployeePageSize(value);
      setEmployeeCurrentPage(1);
    } else {
      setRecordsPerPageInput(employeePageSize.toString());
    }
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <div className="flex items-center space-x-4">
          <img
            src={firstRHLogo}
            alt="Logo First RH Group"
            className="h-auto"
            style={{ width: "15rem", borderRadius: "8px", marginTop: "-10px" }}
          />
        </div>
      </div>

      <form onSubmit={handleFilterSubmit} className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Cliente</label>
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
            <label className="block text-sm font-medium text-gray-700">Nome do Funcionário</label>
            <input
              type="text"
              value={nomeFuncionario}
              onChange={(e) => setNomeFuncionario(e.target.value)}
              className="w-full border border-gray-300 rounded p-2"
              placeholder="Digite o nome do funcionário"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Função</label>
            <Select
              isMulti
              options={functionOptions}
              value={selectedFunctions}
              onChange={(value) => setSelectedFunctions(value as { value: string; label: string }[])}
              placeholder="Selecione ou pesquise..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Sexo</label>
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
        </div>
        <button
          type="submit"
          className="mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
        >
          Aplicar Filtros
        </button>
      </form>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {type === 'ett' && dashboardData.ETT && totalFuncionariosETT > 0 && (
            <div className="mb-6 md:mb-0">
              <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 rounded-lg shadow-lg h-full flex flex-col justify-center">
                <h2 className="text-2xl font-bold text-white mb-4">ETT</h2>
                <p className="text-white text-lg mb-2">
                  Total de Funcionários: <span className="font-bold">{formatNumber(totalFuncionariosETT)}</span>
                </p>
                <p className="text-white text-lg mb-2">
                  Total Folha de Salários: <span className="font-bold">{formatCurrency(totalSalariosETT.toString())}</span>
                </p>
                {(appliedFilters.mesAno.trim() !== "" || appliedFilters.selectedSituations.length > 0) &&
                  dashboardData.ETT.situacoes &&
                  Object.entries(dashboardData.ETT.situacoes).map(([situacao, count]) => (
                    <p key={situacao} className="text-white text-lg mb-2">
                      {situacao[0].toUpperCase() + situacao.slice(1).toLowerCase()}: <span className="font-bold">{formatNumber(Number(count))}</span>
                    </p>
                  ))
                }
              </div>
            </div>
          )}
          {type === 'shift' && dashboardData.SHIFT && totalFuncionariosSHIFT > 0 && (
            <div className="mb-6 md:mb-0">
              <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 rounded-lg shadow-lg h-full flex flex-col justify-center">
                <h2 className="text-2xl font-bold text-white mb-4">SHIFT</h2>
                <p className="text-white text-lg mb-2">
                  Total de Funcionários: <span className="font-bold">{formatNumber(totalFuncionariosSHIFT)}</span>
                </p>
                <p className="text-white text-lg mb-2">
                  Total Folha de Salários: <span className="font-bold">{formatCurrency(totalSalariosSHIFT.toString())}</span>
                </p>
                {(appliedFilters.mesAno.trim() !== "" || appliedFilters.selectedSituations.length > 0) &&
                  dashboardData.SHIFT.situacoes &&
                  Object.entries(dashboardData.SHIFT.situacoes).map(([situacao, count]) => (
                    <p key={situacao} className="text-white text-lg mb-2">
                      {situacao[0].toUpperCase() + situacao.slice(1).toLowerCase()}: <span className="font-bold">{formatNumber(Number(count))}</span>
                    </p>
                  ))
                }
              </div>
            </div>
          )}
          {(!type || (type !== 'ett' && type !== 'shift')) && (
            <>
              {dashboardData.ETT && totalFuncionariosETT > 0 && (
                <div className="mb-6 md:mb-0">
                  <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 rounded-lg shadow-lg h-full flex flex-col justify-center">
                    <h2 className="text-2xl font-bold text-white mb-4">ETT</h2>
                    <p className="text-white text-lg mb-2">
                      Total de Funcionários: <span className="font-bold">{formatNumber(totalFuncionariosETT)}</span>
                    </p>
                    <p className="text-white text-lg mb-2">
                      Total Folha de Salários: <span className="font-bold">{formatCurrency(totalSalariosETT.toString())}</span>
                    </p>
                    {(appliedFilters.mesAno.trim() !== "" || appliedFilters.selectedSituations.length > 0) &&
                      dashboardData.ETT.situacoes &&
                      Object.entries(dashboardData.ETT.situacoes).map(([situacao, count]) => (
                        <p key={situacao} className="text-white text-lg mb-2">
                          {situacao[0].toUpperCase() + situacao.slice(1).toLowerCase()}: <span className="font-bold">{formatNumber(Number(count))}</span>
                        </p>
                      ))
                    }
                  </div>
                </div>
              )}
              {dashboardData.SHIFT && totalFuncionariosSHIFT > 0 && (
                <div className="mb-6 md:mb-0">
                  <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 rounded-lg shadow-lg h-full flex flex-col justify-center">
                    <h2 className="text-2xl font-bold text-white mb-4">SHIFT</h2>
                    <p className="text-white text-lg mb-2">
                      Total de Funcionários: <span className="font-bold">{formatNumber(totalFuncionariosSHIFT)}</span>
                    </p>
                    <p className="text-white text-lg mb-2">
                      Total Folha de Salários: <span className="font-bold">{formatCurrency(totalSalariosSHIFT.toString())}</span>
                    </p>
                    {(appliedFilters.mesAno.trim() !== "" || appliedFilters.selectedSituations.length > 0) &&
                      dashboardData.SHIFT.situacoes &&
                      Object.entries(dashboardData.SHIFT.situacoes).map(([situacao, count]) => (
                        <p key={situacao} className="text-white text-lg mb-2">
                          {situacao[0].toUpperCase() + situacao.slice(1).toLowerCase()}: <span className="font-bold">{formatNumber(Number(count))}</span>
                        </p>
                      ))
                    }
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {dashboardData && (
        <div className="grid grid-cols-1 gap-6 mt-8">
          {type === 'ett' && (
            <div className="bg-white p-4 rounded-lg shadow-lg w-full flex flex-col items-center justify-center">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">
                Funcionários por Gênero - ETT
              </h2>
              <div style={{ height: "400px", width: "60%", display: "flex", justifyContent: "center" }}>
                <Bar data={dataETTChartData ?? { labels: [], datasets: [] }} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
              </div>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center">
                  <span className="w-4 h-4 inline-block mr-2" style={{ backgroundColor: '#4b9cd3' }}></span>
                  <span className="text-gray-700">Masculino</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 h-4 inline-block mr-2" style={{ backgroundColor: '#e87653' }}></span>
                  <span className="text-gray-700">Feminino</span>
                </div>
              </div>
            </div>
          )}
          {type === 'shift' && (
            <div className="bg-white p-4 rounded-lg shadow-lg w-full flex flex-col items-center justify-center">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">
                Funcionários por Gênero - SHIFT
              </h2>
              <div style={{ height: "400px", width: "60%", display: "flex", justifyContent: "center" }}>
                <Bar data={dataSHIFTChartData ?? { labels: [], datasets: [] }} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
              </div>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center">
                  <span className="w-4 h-4 inline-block mr-2" style={{ backgroundColor: '#4b9cd3' }}></span>
                  <span className="text-gray-700">Masculino</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 h-4 inline-block mr-2" style={{ backgroundColor: '#e87653' }}></span>
                  <span className="text-gray-700">Feminino</span>
                </div>
              </div>
            </div>
          )}
          {!type && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-lg shadow-lg w-full flex flex-col items-center justify-center">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">
                  Funcionários por Gênero - ETT
                </h2>
                <div style={{ height: "400px", width: "60%", display: "flex", justifyContent: "center" }}>
                  <Bar data={dataETTChartData ?? { labels: [], datasets: [] }} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                </div>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center">
                    <span className="w-4 h-4 inline-block mr-2" style={{ backgroundColor: '#4b9cd3' }}></span>
                    <span className="text-gray-700">Masculino</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-4 h-4 inline-block mr-2" style={{ backgroundColor: '#e87653' }}></span>
                    <span className="text-gray-700">Feminino</span>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-lg w-full flex flex-col items-center justify-center">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">
                  Funcionários por Gênero - SHIFT
                </h2>
                <div style={{ height: "400px", width: "60%", display: "flex", justifyContent: "center" }}>
                  <Bar data={dataSHIFTChartData ?? { labels: [], datasets: [] }} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                </div>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center">
                    <span className="w-4 h-4 inline-block mr-2" style={{ backgroundColor: '#4b9cd3' }}></span>
                    <span className="text-gray-700">Masculino</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-4 h-4 inline-block mr-2" style={{ backgroundColor: '#e87653' }}></span>
                    <span className="text-gray-700">Feminino</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {dashboardData && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">{functionsChartTitle}</h2>
          <div className="bg-white shadow rounded p-6 w-full mb-6">
            <div className="w-full" style={{ height: '400px' }}>
              {paginatedLabels.length > 0 ? (
                <Bar data={paginatedChartData} options={chartOptions} />
              ) : (
                <p className="text-center">Nenhum dado de função disponível.</p>
              )}
            </div>
            <div className="flex justify-center items-center mt-4 space-x-4">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="mx-4 text-lg font-medium text-gray-700">
                Página {currentPage} de {totalFunctionPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalFunctionPages || totalFunctionPages === 0}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end mb-4">
        <ExportDropdown exportarFuncionarios={exportarFuncionarios} />
      </div>

      <div className="bg-white p-4 rounded-lg shadow-lg mt-6">
        <h2 className="text-xl font-semibold mb-4">Lista de Funcionários</h2>
        {employeesLoading ? (
          <p className="text-center py-4 text-blue-600 font-semibold">
            Carregando funcionários, por favor aguarde...
          </p>
        ) : (
          <table className="table-fixed w-full text-xs border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-300 p-2 w-[8%]">SITUAÇÃO</th>
                <th className="border border-gray-300 p-2 w-[10%]">NOME</th>
                <th className="border border-gray-300 p-2 w-[5%] text-center">SEXO</th>
                <th className="border border-gray-300 p-2 w-[12%]">FUNÇÃO</th>
                <th className="border border-gray-300 p-2 w-[8%]">SALÁRIO</th>
                <th className="border border-gray-300 p-2 w-[10%]">CLIENTE</th>
                <th className="border border-gray-300 p-2 w-[10%]">TIPO DE CONTRATAÇÃO</th>
                <th className="border border-gray-300 p-2 w-[8%] relative">
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
                          setAppliedFilters(prev => ({
                            ...prev,
                            dataAdmissaoRange: newDataAdmissaoRange
                          }));
                          setShowDataAdmissaoFilter(false);
                          fetchDashboardData({
                            ...appliedFilters,
                            dataAdmissaoRange: newDataAdmissaoRange
                          });
                          fetchEmployees(1, {
                            ...appliedFilters,
                            dataAdmissaoRange: newDataAdmissaoRange
                          });
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
                          setAppliedFilters(prev => ({
                            ...prev,
                            prazo180Range: (prazo180From && prazo180To)
                              ? { from: prazo180From, to: prazo180To }
                              : undefined
                          }));
                          setShowPrazo180Filter(false);
                          fetchDashboardData({
                            ...appliedFilters,
                            prazo180Range: prazo180From && prazo180To ? { from: prazo180From, to: prazo180To } : undefined
                          });
                          fetchEmployees(1, {
                            ...appliedFilters,
                            prazo180Range: prazo180From && prazo180To ? { from: prazo180From, to: prazo180To } : undefined
                          });
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
                          setAppliedFilters(prev => ({
                            ...prev,
                            prazo270Range: (prazo270From && prazo270To)
                              ? { from: prazo270From, to: prazo270To }
                              : undefined
                          }));
                          setShowPrazo270Filter(false);
                          fetchDashboardData({
                            ...appliedFilters,
                            prazo270Range: prazo270From && prazo270To ? { from: prazo270From, to: prazo270To } : undefined
                          });
                          fetchEmployees(1, {
                            ...appliedFilters,
                            prazo270Range: prazo270From && prazo270To ? { from: prazo270From, to: prazo270To } : undefined
                          });
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
                    <span>DATA DE DEMISSÃO</span>
                    {!selectedSituations.some(s => s.value === 'ATIVO') && (
                      <button onClick={() => setShowDataDemissaoFilter(prev => !prev)} className="focus:outline-none">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
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
                          setAppliedFilters(prev => ({
                            ...prev,
                            dataDemissaoRange: newDataDemissaoRange
                          }));
                          setShowDataDemissaoFilter(false);
                          fetchDashboardData({
                            ...appliedFilters,
                            dataDemissaoRange: newDataDemissaoRange
                          });
                          fetchEmployees(1, {
                            ...appliedFilters,
                            dataDemissaoRange: newDataDemissaoRange
                          });
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
              {employees.map((emp, index) => {
                const prazo180 = emp.PRAZO_CONTRATO_180_DIAS === "INDETERMINADO" ? "INDETER." : emp.PRAZO_CONTRATO_180_DIAS;
                const prazo270 = emp.PRAZO_CONTRATO_270_DIAS === "INDETERMINADO" ? "INDETER." : emp.PRAZO_CONTRATO_270_DIAS;
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-2">{emp.CODIGOSITACAO}</td>
                    <td className="border border-gray-300 p-2">{emp.NOME_FUNCIONARIO}</td>
                    <td className="border border-gray-300 p-2 text-center">{emp.SEXO}</td>
                    <td className="border border-gray-300 p-2">{emp.NOME_FUNCAO}</td>
                    <td className="border border-gray-300 p-2 text-right">{formatCurrency(emp.SALARIO)}</td>
                    <td className="border border-gray-300 p-2">{emp.DESCRICAO_SECAO}</td>
                    <td className="border border-gray-300 p-2">{emp.TIPO_CONTRATO}</td>
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
              disabled={employeeMeta?.current_page === 1}
              onClick={handleEmployeePrevPage}
              className={`px-4 py-2 rounded-lg font-semibold ${employeeMeta?.current_page === 1
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600"
                }`}
            >
              Anterior
            </button>
            <span className="mx-4 text-lg font-medium text-gray-700">
              Página {employeeMeta?.current_page} de {employeeMeta?.last_page}
            </span>
            <button
              disabled={
                employeeMeta?.current_page === employeeMeta?.last_page ||
                employeeMeta?.last_page === 0
              }
              onClick={handleEmployeeNextPage}
              className={`px-4 py-2 rounded-lg font-semibold ${employeeMeta?.current_page === employeeMeta?.last_page || employeeMeta?.last_page === 0
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

export default DashboardPages;