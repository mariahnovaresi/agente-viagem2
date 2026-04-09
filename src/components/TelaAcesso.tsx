import React from 'react';
import { Plane, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { verificarCota, Cliente } from '../services/supabase';

interface TelaAcessoProps {
  onAcessoLiberado: (cliente: Cliente, codigo: string) => void;
}

const planos = [
  {
    nome: 'Viajante Básico',
    consultas: '10 consultas/mês',
    limite: 10,
    precoMensal: 'R$ 9,90',
    precoAnual: 'R$ 99,90',
    destaque: false,
    emoji: '🌱',
  },
  {
    nome: 'Viajante Intermediário',
    consultas: '30 consultas/mês',
    limite: 30,
    precoMensal: 'R$ 29,90',
    precoAnual: 'R$ 299,90',
    destaque: true,
    emoji: '✈️',
  },
  {
    nome: 'Viajante Frequente',
    consultas: '150 consultas/mês',
    limite: 150,
    precoMensal: 'R$ 99,90',
    precoAnual: 'R$ 999,90',
    destaque: false,
    emoji: '🚀',
  },
];

export default function TelaAcesso({ onAcessoLiberado }: TelaAcessoProps) {
  const [codigo, setCodigo] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [erro, setErro] = React.useState('');
  const [anual, setAnual] = React.useState(false);

  const handleEntrar = async () => {
    if (!codigo.trim()) {
      setErro('Digite seu código de acesso.');
      return;
    }
    setLoading(true);
    setErro('');
    const resultado = await verificarCota(codigo);
    if (resultado.permitido && resultado.cliente) {
      onAcessoLiberado(resultado.cliente, codigo.toUpperCase().trim());
    } else {
      setErro(resultado.mensagem);
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEntrar();
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
      padding: '32px 16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>

      {/* Cabeçalho */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <Plane size={32} color="white" />
        </div>
        <h1 style={{ color: 'white', fontSize: '26px', fontWeight: '700', margin: '0 0 8px' }}>
          Agente de Viagens IA ✈️
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', margin: 0 }}>
          Encontre as melhores passagens em milhas ou dinheiro
        </p>
      </div>

      {/* Box de login */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
        padding: '32px 28px',
        width: '100%',
        maxWidth: '400px',
        marginBottom: '40px',
      }}>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginBottom: '12px', textAlign: 'center' }}>
          Já tem um plano? Digite seu código:
        </p>

        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'rgba(255,255,255,0.08)',
          border: `1px solid ${erro ? '#ef4444' : 'rgba(255,255,255,0.15)'}`,
          borderRadius: '12px', padding: '14px 16px', gap: '10px',
          marginBottom: '12px',
        }}>
          <Lock size={18} color="rgba(255,255,255,0.4)" />
          <input
            type="text"
            placeholder="Ex: BASICO001"
            value={codigo}
            onChange={e => setCodigo(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: 'white', fontSize: '16px', letterSpacing: '2px',
              width: '100%', fontWeight: '600',
            }}
          />
        </div>

        {erro && (
          <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{erro}</p>
        )}

        <button
          onClick={handleEntrar}
          disabled={loading}
          style={{
            width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
            background: loading ? 'rgba(59,130,246,0.5)' : 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            color: 'white', fontSize: '16px', fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          {loading
            ? <><Loader2 size={18} /> Verificando...</>
            : <>Entrar <ArrowRight size={18} /></>
          }
        </button>
      </div>

      {/* Título planos */}
      <h2 style={{ color: 'white', fontSize: '20px', fontWeight: '700', marginBottom: '8px', textAlign: 'center' }}>
        Escolha seu plano
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '24px', textAlign: 'center' }}>
        Assine e receba seu código de acesso pelo WhatsApp
      </p>

      {/* Toggle mensal / anual */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        background: 'rgba(255,255,255,0.07)',
        borderRadius: '50px', padding: '6px 8px',
        marginBottom: '28px',
      }}>
        <button
          onClick={() => setAnual(false)}
          style={{
            padding: '8px 20px', borderRadius: '50px', border: 'none',
            background: !anual ? 'linear-gradient(135deg, #3b82f6, #06b6d4)' : 'transparent',
            color: 'white', fontWeight: '600', fontSize: '14px', cursor: 'pointer',
          }}
        >
          Mensal
        </button>
        <button
          onClick={() => setAnual(true)}
          style={{
            padding: '8px 20px', borderRadius: '50px', border: 'none',
            background: anual ? 'linear-gradient(135deg, #3b82f6, #06b6d4)' : 'transparent',
            color: 'white', fontWeight: '600', fontSize: '14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          Anual
          <span style={{
            background: '#16a34a', color: 'white',
            fontSize: '11px', fontWeight: '700',
            padding: '2px 7px', borderRadius: '50px',
          }}>
            Economize!
          </span>
        </button>
      </div>

      {/* Cards dos planos */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '16px',
        width: '100%', maxWidth: '400px',
      }}>
        {planos.map(plano => (
          <div
            key={plano.nome}
            style={{
              background: plano.destaque
                ? 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(6,182,212,0.15))'
                : 'rgba(255,255,255,0.05)',
              border: plano.destaque
                ? '1px solid rgba(59,130,246,0.5)'
                : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '20px',
              position: 'relative',
            }}
          >
            {/* Badge mais popular */}
            {plano.destaque && (
              <div style={{
                position: 'absolute', top: '-12px', left: '50%',
                transform: 'translateX(-50%)',
                background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                color: 'white', fontSize: '11px', fontWeight: '700',
                padding: '4px 14px', borderRadius: '50px',
                whiteSpace: 'nowrap',
              }}>
                ⭐ Mais popular
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <p style={{ color: 'white', fontWeight: '700', fontSize: '16px', margin: '0 0 4px' }}>
                  {plano.emoji} {plano.nome}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: 0 }}>
                  {plano.consultas}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#06b6d4', fontWeight: '800', fontSize: '20px', margin: 0 }}>
                  {anual ? plano.precoAnual : plano.precoMensal}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: 0 }}>
                  {anual ? '/ano' : '/mês'}
                </p>
              </div>
            </div>

            <a
              href={`https://wa.me/5548988311209?text=Quero+assinar+${encodeURIComponent(plano.nome)}+${anual ? 'Anual' : 'Mensal'}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block', textAlign: 'center',
                padding: '11px', borderRadius: '10px', border: 'none',
                background: '#25d366',
                color: 'white', textDecoration: 'none',
                fontSize: '14px', fontWeight: '600',
              }}
            >
              💬 Assinar pelo WhatsApp
            </a>
          </div>
        ))}
      </div>

      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '32px', textAlign: 'center' }}>
        Após o pagamento você recebe seu código de acesso pelo WhatsApp em até 24h.
      </p>
    </div>
  );
}
