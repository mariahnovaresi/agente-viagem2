import React from 'react';
import { ExternalLink, Plane, Calendar, Wallet, Ticket, Search, Filter, ChevronLeft, ChevronRight, MessageSquare, Send } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { FlightResult, FlightSearchData, SearchOption, ViewOption, DurationOption } from './types';
import { searchFlights } from './services/gemini';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  type?: 'options' | 'input' | 'results';
  data?: any;
}

export default function App() {
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
  const [subStep, setSubStep] = React.useState(0); // 0: Country, 1: State, 2: City, 3: Dates (if needed)
  const [isSelectingDest, setIsSelectingDest] = React.useState(false);
  const [searchData, setSearchData] = React.useState<Partial<FlightSearchData>>({});
  const [results, setResults] = React.useState<FlightResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [viewFilter, setViewFilter] = React.useState<ViewOption>('ambos');
  const [filterType, setFilterType] = React.useState<'price' | 'miles'>('price');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');

  const locations = {
    countries: ['Brasil', 'EUA', 'Portugal', 'Argentina', 'França', 'Espanha', 'Itália', 'Alemanha', 'Reino Unido', 'Canadá', 'Japão', 'México', 'Chile', 'Uruguai', 'Colômbia'],
    states: {
      'Brasil': ['SP', 'RJ', 'SC', 'DF', 'MG', 'PR', 'RS', 'BA', 'PE', 'CE', 'GO', 'MS', 'MT', 'PA', 'AM'],
      'EUA': ['NY', 'FL', 'CA', 'TX', 'IL', 'WA', 'MA', 'NV', 'GA', 'PA'],
      'Portugal': ['Lisboa', 'Porto', 'Algarve', 'Braga', 'Coimbra', 'Madeira', 'Açores'],
      'Argentina': ['Buenos Aires', 'Córdoba', 'Mendoza', 'Santa Fe'],
      'França': ['Île-de-France', 'Provence-Alpes-Côte d\'Azur', 'Auvergne-Rhône-Alpes'],
    } as Record<string, string[]>,
    cities: {
      'SP': ['São Paulo', 'Campinas', 'Guarulhos', 'Ribeirão Preto', 'Santos', 'São José dos Campos'],
      'SC': ['Florianópolis', 'Joinville', 'Navegantes', 'Chapecó', 'Blumenau', 'Criciúma'],
      'DF': ['Brasília'],
      'RJ': ['Rio de Janeiro', 'Cabo Frio', 'Búzios', 'Petrópolis'],
      'MG': ['Belo Horizonte', 'Uberlândia', 'Ouro Preto', 'Tiradentes'],
      'PR': ['Curitiba', 'Londrina', 'Foz do Iguaçu', 'Maringá'],
      'RS': ['Porto Alegre', 'Caxias do Sul', 'Gramado', 'Bento Gonçalves'],
      'BA': ['Salvador', 'Porto Seguro', 'Ilhéus', 'Trancoso'],
      'NY': ['New York City', 'Buffalo', 'Rochester'],
      'FL': ['Miami', 'Orlando', 'Tampa', 'Fort Lauderdale', 'Key West'],
      'CA': ['Los Angeles', 'San Francisco', 'San Diego'],
      'Lisboa': ['Lisboa', 'Sintra', 'Cascais'],
      'Porto': ['Porto', 'Gaia', 'Matosinhos'],
      'Buenos Aires': ['Buenos Aires', 'La Plata', 'Mar del Plata'],
    } as Record<string, string[]>
  };

  const [visibleCount, setVisibleCount] = React.useState(6);

  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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

    addMessage(value, 'user');
    setVisibleCount(6);
    
    if (subStep === 0) { // Country selected
      setTempLocation(prev => ({ ...prev, country: value }));
      const hasStates = !!locations.states[value];
      if (hasStates) {
        setSubStep(1);
        setTimeout(() => addMessage(`Selecione o Estado de ${isSelectingDest ? 'DESTINO' : 'ORIGEM'}:`, 'agent', 'options'), 500);
      } else {
        // If no states defined, treat country as city/destination for simplicity in this demo
        setTempLocation(prev => ({ ...prev, city: value }));
        finalizeLocation(value);
      }
    } else if (subStep === 1) { // State selected
      setTempLocation(prev => ({ ...prev, state: value }));
      const hasCities = !!locations.cities[value];
      if (hasCities) {
        setSubStep(2);
        setTimeout(() => addMessage(`Selecione a Cidade de ${isSelectingDest ? 'DESTINO' : 'ORIGEM'}:`, 'agent', 'options'), 500);
      } else {
        finalizeLocation(value);
      }
    } else if (subStep === 2) { // City selected
      finalizeLocation(value);
    }
  };

  const finalizeLocation = (city: string) => {
    const newData = { ...searchData };
    setVisibleCount(6);
    if (!isSelectingDest) {
      newData.origin = city;
      setSearchData(newData);
      
      // Check if we need destination
      if (newData.option === 3 || newData.option === 4) {
        setIsSelectingDest(true);
        setSubStep(0);
        setTempLocation({ country: '', state: '', city: '' });
        setTimeout(() => addMessage('Agora vamos definir o DESTINO. Selecione o País:', 'agent', 'options'), 500);
      } else if (newData.option === 2) {
        setSubStep(3);
        setTimeout(() => addMessage('Digite as Datas de Ida e Volta no formato DD/MM a DD/MM (ex: 10/05 a 20/05):', 'agent'), 500);
      } else {
        goToStep3(newData);
      }
    } else {
      newData.destination = city;
      setSearchData(newData);
      if (newData.option === 3) {
        setSubStep(3);
        setTimeout(() => addMessage('Digite as Datas de Ida e Volta no formato DD/MM a DD/MM (ex: 10/05 a 20/05):', 'agent'), 500);
      } else {
        goToStep3(newData);
      }
    }
  };

  const goToStep3 = (currentData?: Partial<FlightSearchData>) => {
    const dataToUse = currentData || searchData;
    const updatedData = { ...dataToUse, view: 'ambos' as ViewOption };
    setSearchData(updatedData);
    
    // If option is 2 or 3 (fixed dates), skip step 4
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

    // Legacy parsing just in case
    const lines = input.toLowerCase().split('\n');
    const newData = { ...searchData };
    // ... rest of legacy parsing if needed ...
  };

  const executeSearch = (finalData: FlightSearchData) => {
    setLoading(true);
    addMessage('Buscando as melhores ofertas em tempo real... 🔎', 'agent');
    
    searchFlights(finalData).then(res => {
      // Helper to normalize strings for comparison (remove accents, lowercase)
      const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      
      const searchOrigin = normalize(finalData.origin || "");
      const searchDest = normalize(finalData.destination || "");

      // Filter results to ensure they match origin and destination
      let filtered = res.filter(f => {
        const flightOrigin = normalize(f.origin);
        const flightDest = normalize(f.destination);
        
        const originMatch = flightOrigin.includes(searchOrigin) || searchOrigin.includes(flightOrigin);
        const destMatch = !searchDest || flightDest.includes(searchDest) || searchDest.includes(flightDest);
        
        return originMatch && destMatch;
      });

      // Sort logic based on requirements
      let sorted = [...filtered];
      
      if (finalData.duration !== 'flexivel' && finalData.duration !== 'fixed') {
        const duration = finalData.duration as number;
        // Preferred interval first, then closest
        sorted.sort((a, b) => {
          const diffA = Math.abs(a.durationDays - duration);
          const diffB = Math.abs(b.durationDays - duration);
          if (diffA !== diffB) return diffA - diffB;
          // If same distance, sort by price
          const priceA = a.priceCurrency || (a.priceMiles ? a.priceMiles / 100 : 999999);
          const priceB = b.priceCurrency || (b.priceMiles ? b.priceMiles / 100 : 999999);
          return priceA - priceB;
        });
      } else {
        // Flexible or Fixed: cheapest first, then shortest interval
        sorted.sort((a, b) => {
          const priceA = a.priceCurrency || (a.priceMiles ? a.priceMiles / 100 : 999999);
          const priceB = b.priceCurrency || (b.priceMiles ? b.priceMiles / 100 : 999999);
          if (priceA !== priceB) return priceA - priceB;
          return a.durationDays - b.durationDays;
        });
      }
      
      setResults(sorted);
      setLoading(false);
      
      if (sorted.length > 0) {
        addMessage(`Encontrei ${sorted.length} opções para você! Confira os resultados ao lado. Você pode navegar pelas páginas ou refazer a busca.`, 'agent', 'results');
      } else {
        addMessage('Infelizmente não encontrei voos reais para os critérios exatos informados nos canais oficiais neste momento. 😔\n\nSugestões:\n1. Tente datas diferentes.\n2. Verifique se os nomes das cidades estão corretos.\n3. Tente a opção de datas flexíveis.', 'agent', 'results');
      }
    });
  };

  const handleDurationSelect = (duration: DurationOption) => {
    const finalData = { ...searchData, duration } as FlightSearchData;
    setSearchData(finalData);
    addMessage(duration === 'flexivel' ? 'Flexível' : `${duration} dias`, 'user');
    executeSearch(finalData);
  };

  const paginatedResults = React.useMemo(() => {
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
    
    const start = (currentPage - 1) * 10;
    return filtered.slice(start, start + 10);
  }, [results, currentPage, filterType, sortOrder, viewFilter]);

  const totalPages = Math.ceil(results.length / 10);

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
  };

  return (
    <div className="flex h-screen bg-[#f0f2f5] font-sans text-[#414141] overflow-hidden">
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
                          </>
                        )}
                      </div>
                    )}
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
                        Use as setas no painel lateral para ver mais páginas.
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
              placeholder={step === 2 ? "Digite os detalhes..." : "Aguardando seleção..."}
              className="flex-1 outline-none text-[15px] bg-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value) {
                  handleInputSubmit(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
              disabled={step === 1 || step === 4 || loading}
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
                      onChange={(e) => setViewFilter(e.target.value as any)}
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
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as any)}
                    >
                      <option value="price">Menor Preço (R$)</option>
                      <option value="miles">Menor Milha</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium text-[#667781] bg-[#f0f2f5] px-2 py-1 rounded">
                  {results.length} resultados
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
            <div className="h-[80px] border-t border-[#e9edef] flex items-center justify-center gap-4 bg-white">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#f0f2f5] disabled:opacity-30 transition-colors border border-[#e9edef]"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        "w-10 h-10 rounded-xl text-sm font-bold transition-all",
                        currentPage === pageNum 
                          ? "bg-[#00a884] text-white shadow-md" 
                          : "hover:bg-[#f0f2f5] text-[#54656f]"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {totalPages > 5 && <span className="flex items-end pb-2 text-[#667781]">...</span>}
              </div>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#f0f2f5] disabled:opacity-30 transition-colors border border-[#e9edef]"
              >
                <ChevronRight size={20} />
              </button>
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
