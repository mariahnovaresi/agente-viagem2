import React from 'react';
import { ExternalLink, Plane, Calendar, Wallet, Ticket, Search, Filter, ChevronLeft, ChevronRight, MessageSquare, Send, Phone } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { FlightResult, FlightSearchData, SearchOption, ViewOption, DurationOption } from './types';
import { searchFlights } from './services/gemini';
import { motion, AnimatePresence } from 'motion/react';

const WHATSAPP_UPSELL = 'https://wa.me/5548988311209?text=Quero+fazer+upgrade+do+meu+plano+FlightScan';

interface AppProps {
  onNovaConsulta?: () => void;
  consultasRestantes?: number;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  type?: 'options' | 'input' | 'results';
  data?: any;
}

// Months for "meses fixos" option
const MONTHS = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

export default function App({ onNovaConsulta, consultasRestantes = 999 }: AppProps) {
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: '1',
      text: 'Olá! Sou seu Agente de Viagens AI. Vamos encontrar as melhores passagens para você? ✈️\n\nPor favor, selecione uma das opções abaixo:',
      sender: 'agent',
      timestamp: new Date(),
      type: 'options'
    }
  ]);
  const [step, setStep] = React.useState(1);
  const [subStep, setSubStep] = React.useState(0); // 0: Country, 1: State, 2: City
  const [isSelectingDest, setIsSelectingDest] = React.useState(false);
  const [searchData, setSearchData] = React.useState<Partial<FlightSearchData>>({});
  const [results, setResults] = React.useState<FlightResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [viewFilter, setViewFilter] = React.useState<ViewOption>('ambos');
  const [filterType, setFilterType] = React.useState<'price' | 'miles'>('price');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');
  const [dateMode, setDateMode] = React.useState<'fixo' | 'meses' | null>(null);
  const [selectedMonths, setSelectedMonths] = React.useState<string[]>([]);
  const [showUpsell, setShowUpsell] = React.useState(false);

  // Custom location input state
  const [customLocationMode, setCustomLocationMode] = React.useState<'country' | 'state' | 'city' | null>(null);
  const [customLocationInput, setCustomLocationInput] = React.useState('');

  const locations = {
    countries: ['Brasil', 'EUA', 'Portugal', 'Argentina', 'França', 'Espanha', 'Itália', 'Alemanha', 'Reino Unido', 'Canadá', 'Japão', 'México', 'Chile', 'Uruguai', 'Colômbia', 'Peru', 'Bolívia', 'Paraguai', 'Equador', 'Venezuela'],
    states: {
      'Brasil': ['SP', 'RJ', 'SC', 'DF', 'MG', 'PR', 'RS', 'BA', 'PE', 'CE', 'GO', 'MS', 'MT', 'PA', 'AM', 'ES', 'RN', 'PB', 'AL', 'SE', 'PI', 'MA', 'TO', 'RO', 'AC', 'AP', 'RR'],
      'EUA': ['NY', 'FL', 'CA', 'TX', 'IL', 'WA', 'MA', 'NV', 'GA', 'PA', 'AZ', 'CO', 'OR', 'NC', 'VA'],
      'Portugal': ['Lisboa', 'Porto', 'Algarve', 'Braga', 'Coimbra', 'Madeira', 'Açores', 'Évora', 'Faro'],
      'Argentina': ['Buenos Aires', 'Córdoba', 'Mendoza', 'Santa Fe', 'Tucumán', 'Salta', 'Bariloche'],
      'França': ['Île-de-France', 'Provence-Alpes-Côte d\'Azur', 'Auvergne-Rhône-Alpes', 'Occitanie', 'Nouvelle-Aquitaine'],
      'Espanha': ['Madri', 'Catalunha', 'Andaluzia', 'Valência', 'Galícia', 'País Basco', 'Ilhas Canárias', 'Ilhas Baleares'],
      'Itália': ['Roma', 'Milão', 'Veneza', 'Florença', 'Nápoles', 'Sicília', 'Sardenha'],
    } as Record<string, string[]>,
    cities: {
      'SP': ['São Paulo', 'Campinas', 'Guarulhos', 'Ribeirão Preto', 'Santos', 'São José dos Campos', 'Sorocaba', 'Bauru'],
      'SC': ['Florianópolis', 'Joinville', 'Navegantes', 'Chapecó', 'Blumenau', 'Criciúma', 'Itajaí', 'Balneário Camboriú'],
      'DF': ['Brasília'],
      'RJ': ['Rio de Janeiro', 'Cabo Frio', 'Búzios', 'Petrópolis', 'Angra dos Reis', 'Arraial do Cabo'],
      'MG': ['Belo Horizonte', 'Uberlândia', 'Ouro Preto', 'Tiradentes', 'Confins', 'Montes Claros'],
      'PR': ['Curitiba', 'Londrina', 'Foz do Iguaçu', 'Maringá', 'Cascavel', 'Ponta Grossa'],
      'RS': ['Porto Alegre', 'Caxias do Sul', 'Gramado', 'Bento Gonçalves', 'Pelotas', 'Canela'],
      'BA': ['Salvador', 'Porto Seguro', 'Ilhéus', 'Trancoso', 'Morro de São Paulo', 'Camaçari'],
      'PE': ['Recife', 'Olinda', 'Fernando de Noronha', 'Caruaru', 'Petrolina'],
      'CE': ['Fortaleza', 'Jericoacoara', 'Canoa Quebrada', 'Cumbuco'],
      'GO': ['Goiânia', 'Caldas Novas', 'Pirenópolis', 'Chapada dos Veadeiros'],
      'AM': ['Manaus', 'Tefé', 'Tabatinga'],
      'PA': ['Belém', 'Santarém', 'Marajó'],
      'NY': ['New York City', 'Buffalo', 'Rochester', 'Albany'],
      'FL': ['Miami', 'Orlando', 'Tampa', 'Fort Lauderdale', 'Key West', 'Jacksonville'],
      'CA': ['Los Angeles', 'San Francisco', 'San Diego', 'Las Vegas (NV)', 'Sacramento'],
      'TX': ['Houston', 'Dallas', 'Austin', 'San Antonio'],
      'Lisboa': ['Lisboa', 'Sintra', 'Cascais', 'Setúbal'],
      'Porto': ['Porto', 'Gaia', 'Matosinhos', 'Braga'],
      'Algarve': ['Faro', 'Lagos', 'Albufeira', 'Portimão'],
      'Buenos Aires': ['Buenos Aires', 'La Plata', 'Mar del Plata', 'Tigre'],
      'Córdoba': ['Córdoba', 'Villa Carlos Paz'],
      'Bariloche': ['Bariloche', 'El Bolsón'],
      'Madri': ['Madri', 'Toledo', 'Segóvia'],
      'Catalunha': ['Barcelona', 'Girona', 'Tarragona'],
      'Andaluzia': ['Sevilha', 'Granada', 'Málaga', 'Córdoba'],
      'Ilhas Canárias': ['Tenerife', 'Gran Canaria', 'Lanzarote', 'Fuerteventura'],
      'Roma': ['Roma', 'Nápoles', 'Pompeia'],
      'Milão': ['Milão', 'Bergamo', 'Como'],
      'Veneza': ['Veneza', 'Verona', 'Pádua'],
      'Florença': ['Florença', 'Siena', 'Pisa'],
    } as Record<string, string[]>
  };

  const [visibleCount, setVisibleCount] = React.useState(6);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Show upsell overlay when limit is reached
  React.useEffect(() => {
    if (consultasRestantes <= 0) {
      setShowUpsell(true);
    }
  }, [consultasRestantes]);

  const addMessage = (text: string, sender: 'user' | 'agent', type?: Message['type'], data?: any) => {
    setMessages(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      text,
      sender,
      timestamp: new Date(),
      type,
      data
    }]);
  };

  const handleOptionSelect = (option: SearchOption) => {
    setSearchData({ option });
    addMessage(`Opção ${option}`, 'user');
    setStep(2);
    setSubStep(0);
    setIsSelectingDest(false);
    setVisibleCount(6);
    setCustomLocationMode(null);
    setCustomLocationInput('');

    setTimeout(() => {
      addMessage('Vamos definir a ORIGEM. Selecione o País:', 'agent', 'options');
    }, 500);
  };

  const [tempLocation, setTempLocation] = React.useState({ country: '', state: '', city: '' });

  const handleLocationSelect = (value: string) => {
    if (value === 'MAIS_OPCOES') {
      setVisibleCount(prev => prev + 10);
      return;
    }

    if (value === 'OUTRO') {
      // Activate custom input based on current subStep
      const mode = subStep === 0 ? 'country' : subStep === 1 ? 'state' : 'city';
      setCustomLocationMode(mode);
      setCustomLocationInput('');
      return;
    }

    setCustomLocationMode(null);
    addMessage(value, 'user');
    setVisibleCount(6);

    if (subStep === 0) {
      setTempLocation(prev => ({ ...prev, country: value }));
      const hasStates = !!locations.states[value];
      if (hasStates) {
        setSubStep(1);
        setTimeout(() => addMessage(`Selecione o Estado/Região de ${isSelectingDest ? 'DESTINO' : 'ORIGEM'}:`, 'agent', 'options'), 500);
      } else {
        setTempLocation(prev => ({ ...prev, city: value }));
        finalizeLocation(value);
      }
    } else if (subStep === 1) {
      setTempLocation(prev => ({ ...prev, state: value }));
      const hasCities = !!locations.cities[value];
      if (hasCities) {
        setSubStep(2);
        setTimeout(() => addMessage(`Selecione a Cidade de ${isSelectingDest ? 'DESTINO' : 'ORIGEM'}:`, 'agent', 'options'), 500);
      } else {
        finalizeLocation(value);
      }
    } else if (subStep === 2) {
      finalizeLocation(value);
    }
  };

  const handleCustomLocationSubmit = () => {
    const val = customLocationInput.trim();
    if (!val) return;
    setCustomLocationMode(null);
    setCustomLocationInput('');
    handleLocationSelect(val);
  };

  const finalizeLocation = (city: string) => {
    const newData = { ...searchData };
    setVisibleCount(6);

    if (!isSelectingDest) {
      newData.origin = city;
      setSearchData(newData);

      if (newData.option === 3 || newData.option === 4) {
        setIsSelectingDest(true);
        setSubStep(0);
        setTempLocation({ country: '', state: '', city: '' });
        setTimeout(() => addMessage('Agora vamos definir o DESTINO. Selecione o País:', 'agent', 'options'), 500);
      } else if (newData.option === 2) {
        // Ask for date mode: fixo or meses
        setStep(5);
        setTimeout(() => addMessage('Como deseja informar as datas?', 'agent', 'options'), 500);
      } else {
        goToStep3(newData);
      }
    } else {
      newData.destination = city;
      setSearchData(newData);
      if (newData.option === 3) {
        // Ask for date mode: fixo or meses
        setStep(5);
        setTimeout(() => addMessage('Como deseja informar as datas?', 'agent', 'options'), 500);
      } else {
        goToStep3(newData);
      }
    }
  };

  const handleDateModeSelect = (mode: 'fixo' | 'meses') => {
    setDateMode(mode);
    addMessage(mode === 'fixo' ? 'Datas Fixas' : 'Escolher Meses', 'user');
    if (mode === 'fixo') {
      setSubStep(3);
      setStep(2);
      setTimeout(() => addMessage('Digite as Datas de Ida e Volta no formato DD/MM a DD/MM (ex: 10/05 a 20/05):', 'agent'), 500);
    } else {
      setStep(6);
      setSelectedMonths([]);
      setTimeout(() => addMessage('Selecione até 3 meses de interesse (clique nos meses desejados):', 'agent', 'options'), 500);
    }
  };

  const toggleMonth = (month: string) => {
    setSelectedMonths(prev => {
      if (prev.includes(month)) return prev.filter(m => m !== month);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, month];
    });
  };

  const confirmMonths = () => {
    if (selectedMonths.length === 0) return;
    const labels = selectedMonths.map(m => MONTHS.find(x => x.value === m)?.label).join(', ');
    addMessage(labels, 'user');
    // Pass only flexMonths — do NOT set departureDate/returnDate to avoid confusing the model
    const newData = {
      ...searchData,
      departureDate: undefined,
      returnDate: undefined,
      flexMonths: selectedMonths,
    } as any;
    setSearchData(newData);
    goToStep3(newData);
  };

  const goToStep3 = (currentData?: Partial<FlightSearchData>) => {
    const dataToUse = currentData || searchData;
    const updatedData = { ...dataToUse, view: 'ambos' as ViewOption };
    setSearchData(updatedData);

    if (updatedData.option === 2 || updatedData.option === 3) {
      executeSearch({ ...updatedData, duration: 'fixed' } as FlightSearchData);
    } else {
      setTimeout(() => {
        addMessage('Qual o intervalo de dias desejado entre ida e volta?', 'agent', 'options');
        setStep(4);
      }, 500);
    }
  };

  const handleInputSubmit = (input: string) => {
    addMessage(input, 'user');

    if (step === 2 && subStep === 3) {
      const dates = input.split(' a ');
      if (dates.length < 2) {
        addMessage('Por favor, use o formato DD/MM a DD/MM (ex: 10/05 a 20/05):', 'agent');
        return;
      }
      const newData = {
        ...searchData,
        departureDate: dates[0]?.trim(),
        returnDate: dates[1]?.trim()
      };
      setSearchData(newData);
      goToStep3(newData);
      return;
    }
  };

  const executeSearch = async (finalData: FlightSearchData) => {
    // Check quota before searching
    if (consultasRestantes <= 0) {
      setShowUpsell(true);
      return;
    }

    setLoading(true);
    addMessage('Buscando as melhores ofertas em tempo real... 🔎', 'agent');

    // Register the query usage
    if (onNovaConsulta) await onNovaConsulta();

    searchFlights(finalData).then(res => {
      const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

      const searchOrigin = normalize(finalData.origin || "");
      const searchDest = normalize(finalData.destination || "");

      let filtered = res.filter(f => {
        const flightOrigin = normalize(f.origin);
        const flightDest = normalize(f.destination);
        const originMatch = flightOrigin.includes(searchOrigin) || searchOrigin.includes(flightOrigin);
        const destMatch = !searchDest || flightDest.includes(searchDest) || searchDest.includes(flightDest);
        return originMatch && destMatch;
      });

      // Sort by most recent departure date first, then by price
      let sorted = [...filtered].sort((a, b) => {
        // Parse dates for comparison (DD/MM format)
        const parseDate = (d: string) => {
          if (!d) return 0;
          const parts = d.split('/');
          if (parts.length >= 2) {
            const year = parts[2] ? parseInt(parts[2]) : new Date().getFullYear();
            return new Date(year, parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
          }
          return 0;
        };
        const dateA = parseDate(a.departureDate);
        const dateB = parseDate(b.departureDate);
        if (dateA !== dateB) return dateA - dateB; // most recent first (ascending)
        // secondary: price
        const priceA = a.priceCurrency || (a.priceMiles ? a.priceMiles / 100 : 999999);
        const priceB = b.priceCurrency || (b.priceMiles ? b.priceMiles / 100 : 999999);
        return priceA - priceB;
      });

      setResults(sorted);
      setCurrentPage(1);
      setLoading(false);

      if (sorted.length > 0) {
        addMessage(`Encontrei ${sorted.length} opções para você! Confira os resultados ao lado. Você pode navegar pelas páginas para ver mais datas.`, 'agent', 'results');
      } else {
        addMessage('Infelizmente não encontrei voos reais para os critérios informados no momento. 😔\n\nSugestões:\n1. Tente datas diferentes.\n2. Verifique se os nomes das cidades estão corretos.\n3. Tente a opção de datas flexíveis.', 'agent', 'results');
      }
    });
  };

  const handleDurationSelect = (duration: DurationOption) => {
    const finalData = { ...searchData, duration } as FlightSearchData;
    setSearchData(finalData);
    addMessage(duration === 'flexivel' ? 'Flexível' : `${duration} dias`, 'user');
    executeSearch(finalData);
  };

  const RESULTS_PER_PAGE = 5;

  const filteredAndSortedResults = React.useMemo(() => {
    let filtered = results.filter(f => {
      if (viewFilter === 'milhas') return !!f.priceMiles;
      if (viewFilter === 'moeda') return !!f.priceCurrency;
      return true;
    });

    if (filterType === 'price') {
      filtered.sort((a, b) => sortOrder === 'asc'
        ? (a.priceCurrency || 999999) - (b.priceCurrency || 999999)
        : (b.priceCurrency || 0) - (a.priceCurrency || 0)
      );
    } else {
      filtered.sort((a, b) => sortOrder === 'asc'
        ? (a.priceMiles || 999999) - (b.priceMiles || 999999)
        : (b.priceMiles || 0) - (a.priceMiles || 0)
      );
    }
    return filtered;
  }, [results, filterType, sortOrder, viewFilter]);

  const totalPages = Math.ceil(filteredAndSortedResults.length / RESULTS_PER_PAGE);

  const paginatedResults = React.useMemo(() => {
    const start = (currentPage - 1) * RESULTS_PER_PAGE;
    return filteredAndSortedResults.slice(start, start + RESULTS_PER_PAGE);
  }, [filteredAndSortedResults, currentPage]);

  const resetSearch = () => {
    setMessages([{
      id: '1',
      text: 'Olá! Sou seu Agente de Viagens AI. Vamos encontrar as melhores passagens para você? ✈️\n\nPor favor, selecione uma das opções abaixo:',
      sender: 'agent',
      timestamp: new Date(),
      type: 'options'
    }]);
    setStep(1);
    setSubStep(0);
    setIsSelectingDest(false);
    setSearchData({});
    setResults([]);
    setCurrentPage(1);
    setViewFilter('ambos');
    setDateMode(null);
    setSelectedMonths([]);
    setCustomLocationMode(null);
    setCustomLocationInput('');
  };

  // Pagination page numbers with ellipsis
  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [];
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  // Quota bar color
  const quotaPercent = consultasRestantes > 0 ? Math.min(100, (consultasRestantes / 10) * 100) : 0;
  const quotaColor = consultasRestantes <= 2 ? '#ef4444' : consultasRestantes <= 5 ? '#f59e0b' : '#06b6d4';

  return (
    <div className="flex h-screen bg-[#f0f2f5] font-sans text-[#414141] overflow-hidden relative">

      {/* Upsell Overlay */}
      <AnimatePresence>
        {showUpsell && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.75)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '24px',
            }}
          >
            <motion.div
              initial={{ scale: 0.85, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
                border: '1px solid rgba(59,130,246,0.4)',
                borderRadius: '24px',
                padding: '36px 28px',
                maxWidth: '380px',
                width: '100%',
                textAlign: 'center',
              }}
            >
              <div style={{
                width: '72px', height: '72px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #ef4444, #f59e0b)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: '32px',
              }}>
                🚫
              </div>
              <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '700', marginBottom: '12px' }}>
                Limite de consultas atingido
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '14px', lineHeight: '1.6', marginBottom: '28px' }}>
                Você usou todas as suas consultas disponíveis neste plano. Faça um upgrade para continuar buscando as melhores passagens! ✈️
              </p>
              <a
                href={WHATSAPP_UPSELL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  padding: '16px', borderRadius: '14px',
                  background: '#25d366',
                  color: 'white', textDecoration: 'none',
                  fontSize: '16px', fontWeight: '700',
                  marginBottom: '12px',
                }}
              >
                <Phone size={20} /> Fazer Upgrade pelo WhatsApp
              </a>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>
                Atendimento rápido • Ativação imediata
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar - WhatsApp Style Chat */}
      <div className={cn(
        "flex flex-col w-full md:w-[420px] bg-white border-r border-[#e9edef] transition-all duration-300",
        results.length > 0 && "hidden md:flex"
      )}>
        {/* Header */}
        <div className="h-[60px] bg-[#f0f2f5] flex items-center px-4 border-b border-[#e9edef] gap-3">
          <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center text-white shadow-sm">
            <Plane size={24} />
          </div>
          <div className="flex-1">
            <h1 className="font-semibold text-[15px]">Agente de Viagens AI</h1>
            <p className="text-[12px] text-[#667781]">Online</p>
          </div>

          {/* Quota counter - top right */}
          <button
            onClick={consultasRestantes <= 0 ? () => setShowUpsell(true) : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: consultasRestantes <= 0 ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.8)',
              border: `1px solid ${quotaColor}33`,
              borderRadius: '20px',
              padding: '4px 10px 4px 8px',
              cursor: consultasRestantes <= 0 ? 'pointer' : 'default',
              flexShrink: 0,
            }}
            title={consultasRestantes <= 0 ? 'Clique para fazer upgrade' : `${consultasRestantes} consultas restantes`}
          >
            {/* Mini bar */}
            <div style={{ position: 'relative', width: '28px', height: '4px', borderRadius: '2px', background: '#e9edef', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${Math.max(0, Math.min(100, quotaPercent))}%`,
                background: quotaColor,
                borderRadius: '2px',
                transition: 'width 0.4s ease',
              }} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: '700', color: quotaColor, whiteSpace: 'nowrap' }}>
              {consultasRestantes <= 0 ? '0 restantes' : `${consultasRestantes} restantes`}
            </span>
            {consultasRestantes <= 0 && (
              <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: '600' }}>↑ Upgrade</span>
            )}
          </button>

          <button
            onClick={resetSearch}
            className="p-2 hover:bg-[#e9edef] rounded-full text-[#54656f] transition-colors"
            title="Nova Busca"
          >
            <MessageSquare size={20} />
          </button>
        </div>

        {/* Chat Area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#efeae2] relative"
          style={{
            backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
            backgroundSize: '400px',
            backgroundRepeat: 'repeat'
          }}
        >
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={cn(
                  "max-w-[85%] p-2.5 rounded-lg shadow-sm text-[14.2px] relative",
                  msg.sender === 'user'
                    ? "bg-[#d9fdd3] ml-auto rounded-tr-none"
                    : "bg-white mr-auto rounded-tl-none"
                )}
              >
                {/* Bubble Tail */}
                <div className={cn(
                  "absolute top-0 w-2 h-3",
                  msg.sender === 'user'
                    ? "right-[-8px] bg-[#d9fdd3] [clip-path:polygon(0_0,0_100%,100%_0)]"
                    : "left-[-8px] bg-white [clip-path:polygon(100%_0,100%_100%,0_0)]"
                )} />

                <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>

                {/* Options Rendering */}
                {msg.type === 'options' && msg.sender === 'agent' && (
                  <div className="mt-3 space-y-2 border-t border-[#f0f2f5] pt-3">

                    {/* Step 1: Search type */}
                    {step === 1 && (
                      <div className="grid gap-2">
                        {[
                          { id: 1, label: 'Origem somente (Datas flexíveis)' },
                          { id: 2, label: 'Origem e Datas fixas' },
                          { id: 3, label: 'Origem, Destino e Datas fixas' },
                          { id: 4, label: 'Origem e Destino (Datas flexíveis)' }
                        ].map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => handleOptionSelect(opt.id as SearchOption)}
                            className="w-full text-left p-3 rounded-lg bg-[#f0f2f5] hover:bg-[#e9edef] transition-all hover:translate-x-1 text-[13px] flex items-center gap-3 group"
                          >
                            <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center font-bold text-[#00a884] shadow-sm group-hover:bg-[#00a884] group-hover:text-white transition-colors">
                              {opt.id}
                            </span>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Step 2: Location selection */}
                    {step === 2 && (
                      <div className="grid grid-cols-2 gap-2">
                        {subStep === 0 && (
                          <>
                            {locations.countries.slice(0, visibleCount).map(c => (
                              <button key={c} onClick={() => handleLocationSelect(c)} className="p-2 rounded-lg bg-[#f0f2f5] hover:bg-[#e9edef] text-[13px]">{c}</button>
                            ))}
                            {locations.countries.length > visibleCount && (
                              <button onClick={() => handleLocationSelect('MAIS_OPCOES')} className="col-span-2 p-2 rounded-lg bg-[#e7fdd3] hover:bg-[#d1f7bc] text-[13px] font-bold text-[#00a884]">+ Ver Mais Países</button>
                            )}
                            {/* OUTRO option */}
                            {customLocationMode === 'country' ? (
                              <div className="col-span-2 flex gap-2 mt-1">
                                <input
                                  autoFocus
                                  value={customLocationInput}
                                  onChange={e => setCustomLocationInput(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && handleCustomLocationSubmit()}
                                  placeholder="Digite o país..."
                                  className="flex-1 p-2 rounded-lg border border-[#00a884] outline-none text-[13px] bg-white"
                                />
                                <button onClick={handleCustomLocationSubmit} className="p-2 rounded-lg bg-[#00a884] text-white text-[13px] font-bold px-3">OK</button>
                              </div>
                            ) : (
                              <button onClick={() => handleLocationSelect('OUTRO')} className="col-span-2 p-2 rounded-lg bg-[#fff3cd] hover:bg-[#ffe8a1] text-[13px] font-bold text-[#856404]">✏️ Outro (digitar manualmente)</button>
                            )}
                          </>
                        )}
                        {subStep === 1 && (
                          <>
                            {(locations.states[tempLocation.country] || []).slice(0, visibleCount).map(s => (
                              <button key={s} onClick={() => handleLocationSelect(s)} className="p-2 rounded-lg bg-[#f0f2f5] hover:bg-[#e9edef] text-[13px]">{s}</button>
                            ))}
                            {(locations.states[tempLocation.country] || []).length > visibleCount && (
                              <button onClick={() => handleLocationSelect('MAIS_OPCOES')} className="col-span-2 p-2 rounded-lg bg-[#e7fdd3] hover:bg-[#d1f7bc] text-[13px] font-bold text-[#00a884]">+ Ver Mais Estados</button>
                            )}
                            {customLocationMode === 'state' ? (
                              <div className="col-span-2 flex gap-2 mt-1">
                                <input
                                  autoFocus
                                  value={customLocationInput}
                                  onChange={e => setCustomLocationInput(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && handleCustomLocationSubmit()}
                                  placeholder="Digite o estado/região..."
                                  className="flex-1 p-2 rounded-lg border border-[#00a884] outline-none text-[13px] bg-white"
                                />
                                <button onClick={handleCustomLocationSubmit} className="p-2 rounded-lg bg-[#00a884] text-white text-[13px] font-bold px-3">OK</button>
                              </div>
                            ) : (
                              <button onClick={() => handleLocationSelect('OUTRO')} className="col-span-2 p-2 rounded-lg bg-[#fff3cd] hover:bg-[#ffe8a1] text-[13px] font-bold text-[#856404]">✏️ Outro (digitar manualmente)</button>
                            )}
                          </>
                        )}
                        {subStep === 2 && (
                          <>
                            {(locations.cities[tempLocation.state] || []).slice(0, visibleCount).map(city => (
                              <button key={city} onClick={() => handleLocationSelect(city)} className="p-2 rounded-lg bg-[#f0f2f5] hover:bg-[#e9edef] text-[13px]">{city}</button>
                            ))}
                            {(locations.cities[tempLocation.state] || []).length > visibleCount && (
                              <button onClick={() => handleLocationSelect('MAIS_OPCOES')} className="col-span-2 p-2 rounded-lg bg-[#e7fdd3] hover:bg-[#d1f7bc] text-[13px] font-bold text-[#00a884]">+ Ver Mais Cidades</button>
                            )}
                            {customLocationMode === 'city' ? (
                              <div className="col-span-2 flex gap-2 mt-1">
                                <input
                                  autoFocus
                                  value={customLocationInput}
                                  onChange={e => setCustomLocationInput(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && handleCustomLocationSubmit()}
                                  placeholder="Digite a cidade..."
                                  className="flex-1 p-2 rounded-lg border border-[#00a884] outline-none text-[13px] bg-white"
                                />
                                <button onClick={handleCustomLocationSubmit} className="p-2 rounded-lg bg-[#00a884] text-white text-[13px] font-bold px-3">OK</button>
                              </div>
                            ) : (
                              <button onClick={() => handleLocationSelect('OUTRO')} className="col-span-2 p-2 rounded-lg bg-[#fff3cd] hover:bg-[#ffe8a1] text-[13px] font-bold text-[#856404]">✏️ Outro (digitar manualmente)</button>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Step 4: Duration */}
                    {step === 4 && (
                      <div className="grid grid-cols-3 gap-2">
                        {[3, 5, 7, 10, 15, 20, 25, 30].map(d => (
                          <button
                            key={d}
                            onClick={() => handleDurationSelect(d)}
                            className="p-2 rounded-lg bg-[#f0f2f5] hover:bg-[#e9edef] text-[13px] font-medium transition-colors"
                          >
                            {d} dias
                          </button>
                        ))}
                        <button
                          onClick={() => handleDurationSelect('flexivel')}
                          className="col-span-3 p-2.5 rounded-lg bg-[#f0f2f5] hover:bg-[#e9edef] text-[13px] font-bold text-[#00a884] transition-colors"
                        >
                          Flexível
                        </button>
                      </div>
                    )}

                    {/* Step 5: Date mode selection */}
                    {step === 5 && (
                      <div className="grid gap-2">
                        <button
                          onClick={() => handleDateModeSelect('fixo')}
                          className="w-full p-3 rounded-lg bg-[#f0f2f5] hover:bg-[#e9edef] text-[13px] font-medium text-left flex items-center gap-3"
                        >
                          <span className="text-lg">📅</span>
                          <div>
                            <div className="font-bold">Data Fixa</div>
                            <div className="text-[11px] text-[#667781]">Informe a data exata de ida e volta</div>
                          </div>
                        </button>
                        <button
                          onClick={() => handleDateModeSelect('meses')}
                          className="w-full p-3 rounded-lg bg-[#f0f2f5] hover:bg-[#e9edef] text-[13px] font-medium text-left flex items-center gap-3"
                        >
                          <span className="text-lg">🗓️</span>
                          <div>
                            <div className="font-bold">Escolher Meses</div>
                            <div className="text-[11px] text-[#667781]">Selecione até 3 meses de interesse</div>
                          </div>
                        </button>
                      </div>
                    )}

                    {/* Step 6: Month picker */}
                    {step === 6 && (
                      <div>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          {MONTHS.map(m => {
                            const isSelected = selectedMonths.includes(m.value);
                            const isDisabled = !isSelected && selectedMonths.length >= 3;
                            return (
                              <button
                                key={m.value}
                                onClick={() => !isDisabled && toggleMonth(m.value)}
                                style={{
                                  padding: '8px 4px',
                                  borderRadius: '8px',
                                  border: isSelected ? '2px solid #00a884' : '2px solid transparent',
                                  background: isSelected ? '#e7fdd3' : '#f0f2f5',
                                  fontSize: '12px',
                                  fontWeight: isSelected ? '700' : '500',
                                  color: isSelected ? '#00a884' : isDisabled ? '#aaa' : '#414141',
                                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                                  opacity: isDisabled ? 0.5 : 1,
                                  transition: 'all 0.15s',
                                }}
                              >
                                {m.label}
                              </button>
                            );
                          })}
                        </div>
                        <div className="text-[11px] text-[#667781] mb-2 text-center">
                          {selectedMonths.length}/3 meses selecionados
                        </div>
                        {selectedMonths.length > 0 && (
                          <button
                            onClick={confirmMonths}
                            className="w-full p-2.5 rounded-lg bg-[#00a884] text-white text-[13px] font-bold"
                          >
                            Confirmar Meses ✓
                          </button>
                        )}
                      </div>
                    )}

                  </div>
                )}

                {/* Results Footer Options */}
                {msg.type === 'results' && msg.sender === 'agent' && (
                  <div className="mt-3 pt-3 border-t border-[#f0f2f5] flex flex-col gap-2">
                    <button
                      onClick={resetSearch}
                      className="w-full p-2 rounded-lg bg-[#00a884] text-white text-[13px] font-bold flex items-center justify-center gap-2"
                    >
                      <MessageSquare size={16} /> Refazer Nova Busca
                    </button>
                    {totalPages > 1 && (
                      <div className="text-[12px] text-[#667781] text-center italic">
                        Use as setas no painel lateral para ver mais páginas e datas.
                      </div>
                    )}
                  </div>
                )}

                <div className="text-[10px] text-[#667781] text-right mt-1 opacity-70">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && (
            <div className="bg-white p-3 rounded-lg shadow-sm mr-auto rounded-tl-none max-w-[85%] flex items-center gap-3">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00a884] animate-bounce" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#00a884] animate-bounce delay-75" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#00a884] animate-bounce delay-150" />
              </div>
              <span className="text-[12px] text-[#667781]">Pesquisando...</span>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="min-h-[62px] bg-[#f0f2f5] flex items-center px-4 py-2 gap-3">
          <div className="flex-1 bg-white rounded-lg px-3 py-2.5 flex items-center shadow-sm">
            <input
              type="text"
              placeholder={step === 2 && subStep === 3 ? "Ex: 10/06 a 20/06" : step === 2 ? "Digite os detalhes..." : "Aguardando seleção..."}
              className="flex-1 outline-none text-[15px] bg-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value) {
                  handleInputSubmit(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
              disabled={step === 1 || step === 4 || step === 5 || step === 6 || loading}
            />
          </div>
          <button className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all",
            loading ? "bg-[#f0f2f5] text-[#667781]" : "bg-[#00a884] text-white shadow-md hover:bg-[#008f70]"
          )}>
            <Send size={20} />
          </button>
        </div>
      </div>

      {/* Main Content - Results Area */}
      <div className={cn(
        "flex flex-col flex-1 bg-white transition-all duration-300",
        results.length === 0 && "hidden md:flex"
      )}>
        {results.length > 0 ? (
          <>
            {/* Results Header */}
            <div className="h-[60px] border-b border-[#e9edef] flex items-center justify-between px-6 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setResults([])}
                  className="md:hidden p-2 hover:bg-[#f0f2f5] rounded-full"
                >
                  <ChevronLeft size={24} />
                </button>
                <h2 className="font-bold text-lg text-[#111b21]">Ofertas Encontradas</h2>
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center bg-[#f0f2f5] rounded-full px-4 py-1.5 gap-2 border border-[#e9edef]">
                    <Search size={14} className="text-[#667781]" />
                    <select
                      className="bg-transparent text-xs font-semibold outline-none cursor-pointer text-[#54656f]"
                      value={viewFilter}
                      onChange={(e) => { setViewFilter(e.target.value as any); setCurrentPage(1); }}
                    >
                      <option value="ambos">Ver Ambos</option>
                      <option value="moeda">Apenas Moeda (R$)</option>
                      <option value="milhas">Apenas Milhas</option>
                    </select>
                  </div>
                  <div className="hidden sm:flex items-center bg-[#f0f2f5] rounded-full px-4 py-1.5 gap-2 border border-[#e9edef]">
                    <Filter size={14} className="text-[#667781]" />
                    <select
                      className="bg-transparent text-xs font-semibold outline-none cursor-pointer text-[#54656f]"
                      value={`${filterType}-${sortOrder}`}
                      onChange={(e) => {
                        const [ft, so] = e.target.value.split('-');
                        setFilterType(ft as any);
                        setSortOrder(so as any);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="price-asc">Menor Preço (R$)</option>
                      <option value="price-desc">Maior Preço (R$)</option>
                      <option value="miles-asc">Menor Milha</option>
                      <option value="miles-desc">Maior Milha</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium text-[#667781] bg-[#f0f2f5] px-2 py-1 rounded">
                  {filteredAndSortedResults.length} resultados
                </span>
                <button
                  onClick={resetSearch}
                  className="text-xs font-bold text-[#00a884] hover:underline"
                >
                  Nova Busca
                </button>
              </div>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-[#f8f9fa]">
              {paginatedResults.map((flight, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={idx}
                  className="bg-white rounded-2xl shadow-sm border border-[#e9edef] overflow-hidden hover:shadow-md transition-all group"
                >
                  <div className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#e7f7f4] flex items-center justify-center text-[#00a884] group-hover:scale-110 transition-transform">
                          <Plane size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-[#111b21] text-lg">{flight.airline}</h3>
                          <div className="flex items-center gap-2 text-xs font-bold text-[#667781] uppercase tracking-widest">
                            <span>{flight.origin}</span>
                            <div className="w-4 h-[1px] bg-[#d1d7db]" />
                            <span>{flight.destination}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex flex-wrap justify-end items-center gap-2">
                          {flight.priceCurrency && (
                            <span className="text-[#00a884] font-black text-2xl">
                              R$ {flight.priceCurrency.toLocaleString('pt-BR')}
                            </span>
                          )}
                          {flight.priceCurrency && flight.priceMiles && (
                            <span className="text-[#667781] font-medium text-sm">ou</span>
                          )}
                          {flight.priceMiles && (
                            <span className="text-[#00a884] font-black text-2xl">
                              {flight.priceMiles.toLocaleString('pt-BR')} <span className="text-sm font-bold uppercase">milhas</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-[#667781] bg-[#f0f2f5] px-2 py-0.5 rounded-full mt-1">
                          {flight.durationDays} dias de viagem
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 border-t border-[#f0f2f5]">
                      <div className="flex items-center gap-8">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-[#667781] uppercase tracking-tighter">Partida</span>
                          <div className="flex items-center gap-2 text-sm font-bold text-[#111b21]">
                            <Calendar size={14} className="text-[#00a884]" />
                            {flight.departureDate}
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-[#667781] uppercase tracking-tighter">Retorno</span>
                          <div className="flex items-center gap-2 text-sm font-bold text-[#111b21]">
                            <Calendar size={14} className="text-[#00a884]" />
                            {flight.returnDate}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <a
                          href={flight.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#00a884] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#008f70] transition-all shadow-lg shadow-[#00a88422] active:scale-95"
                        >
                          Reservar Agora <ExternalLink size={16} />
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            <div className="border-t border-[#e9edef] flex items-center justify-center gap-2 bg-white py-3 px-4 flex-wrap">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f0f2f5] disabled:opacity-30 transition-colors border border-[#e9edef]"
              >
                <ChevronLeft size={18} />
              </button>

              <div className="flex gap-1 flex-wrap justify-center">
                {getPageNumbers().map((pageNum, i) =>
                  pageNum === '...' ? (
                    <span key={`ellipsis-${i}`} className="flex items-center px-1 text-[#667781] text-sm">…</span>
                  ) : (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum as number)}
                      className={cn(
                        "w-9 h-9 rounded-xl text-sm font-bold transition-all",
                        currentPage === pageNum
                          ? "bg-[#00a884] text-white shadow-md"
                          : "hover:bg-[#f0f2f5] text-[#54656f]"
                      )}
                    >
                      {pageNum}
                    </button>
                  )
                )}
              </div>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f0f2f5] disabled:opacity-30 transition-colors border border-[#e9edef]"
              >
                <ChevronRight size={18} />
              </button>

              <span className="text-xs text-[#667781] ml-2">
                Página {currentPage} de {totalPages}
              </span>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#667781] p-10 text-center bg-[#f8f9fa]">
            <div className="w-24 h-24 rounded-full bg-white shadow-sm flex items-center justify-center mb-8 text-[#00a884]">
              <Plane size={48} className="animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-[#111b21] mb-3">Pronto para decolar?</h2>
            <p className="max-w-md text-[#667781] leading-relaxed">
              Complete as informações no chat do WhatsApp ao lado para que eu possa varrer todas as companhias aéreas e encontrar o melhor preço para você.
            </p>
            <div className="mt-8 flex gap-4">
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-[#00a884]">
                  <Wallet size={20} />
                </div>
                <span className="text-[10px] font-bold uppercase">Melhor Preço</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-[#00a884]">
                  <Ticket size={20} />
                </div>
                <span className="text-[10px] font-bold uppercase">Milhas</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-[#00a884]">
                  <Calendar size={20} />
                </div>
                <span className="text-[10px] font-bold uppercase">Datas Flexíveis</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
