import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import TelaAcesso from './components/TelaAcesso';
import { Cliente, registrarConsulta } from './services/supabase';
import './index.css';

function Root() {
  const [cliente, setCliente] = React.useState<Cliente | null>(null);
  const [codigoAtivo, setCodigoAtivo] = React.useState<string>('');

  const handleAcessoLiberado = (clienteLogado: Cliente, codigo: string) => {
    setCliente(clienteLogado);
    setCodigoAtivo(codigo);
  };

  const handleNovaConsulta = async () => {
    if (codigoAtivo) {
      await registrarConsulta(codigoAtivo);
      // Atualiza o contador localmente para mostrar na tela
      setCliente(prev => prev ? {
        ...prev,
        consultas_usadas: prev.consultas_usadas + 1
      } : null);
    }
  };

  if (!cliente) {
    return <TelaAcesso onAcessoLiberado={handleAcessoLiberado} />;
  }

  return (
    <div>
      {/* Barra de status do plano */}
      <div style={{
        background: '#0f172a',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '8px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '13px',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>
          ✈️ Olá, <strong style={{ color: 'white' }}>{cliente.nome}</strong> — Plano {cliente.plano}
        </span>
        <span style={{
          color: cliente.consultas_usadas >= cliente.limite ? '#ef4444' : '#06b6d4',
          fontWeight: '600',
        }}>
          {cliente.limite - cliente.consultas_usadas} consultas restantes
        </span>
      </div>

      {/* Agente principal */}
      <App onNovaConsulta={handleNovaConsulta} consultasRestantes={cliente.limite - cliente.consultas_usadas} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
