import React from 'react';
import { Plane, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { verificarCota, Cliente } from '../services/supabase';

interface TelaAcessoProps {
  onAcessoLiberado: (cliente: Cliente, codigo: string) => void;
}

export default function TelaAcesso({ onAcessoLiberado }: TelaAcessoProps) {
  const [codigo, setCodigo] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [erro, setErro] = React.useState('');

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
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
      padding: '24px',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '24px',
        padding: '48px 40px',
        width: '100%',
        maxWidth: '420px',
        textAlign: 'center',
      }}>
        {/* Ícone */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <Plane size={32} color="white" />
        </div>

        {/* Título */}
        <h1 style={{ color: 'white', fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
          Agente de Viagens IA ✈️
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '32px' }}>
          Digite seu código de acesso para entrar
        </p>

        {/* Campo de código */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.08)',
            border: `1px solid ${erro ? '#ef4444' : 'rgba(255,255,255,0.15)'}`,
            borderRadius: '12px',
            padding: '14px 16px',
            gap: '10px',
          }}>
            <Lock size={18} color="rgba(255,255,255,0.4)" />
            <input
              type="text"
              placeholder="Ex: BASICO001"
              value={codigo}
              onChange={e => setCodigo(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'white',
                fontSize: '16px',
                letterSpacing: '2px',
                width: '100%',
                fontWeight: '600',
              }}
            />
          </div>
          {erro && (
            <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px', textAlign: 'left' }}>
              {erro}
            </p>
          )}
        </div>

        {/* Botão entrar */}
        <button
          onClick={handleEntrar}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '12px',
            border: 'none',
            background: loading ? 'rgba(59,130,246,0.5)' : 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '32px',
          }}
        >
          {loading ? (
            <><Loader2 size={18} className="animate-spin" /> Verificando...</>
          ) : (
            <>Entrar <ArrowRight size={18} /></>
          )}
        </button>

        {/* Divisor */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '12px' }}>
            Ainda não tem acesso?
          </p>

          {/* Planos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { nome: 'Plano Básico', consultas: '30 consultas/mês', preco: 'R$ 29' },
              { nome: 'Plano Profissional', consultas: '150 consultas/mês', preco: 'R$ 79' },
              { nome: 'Plano Business', consultas: 'Ilimitado', preco: 'R$ 199' },
            ].map(plano => (
              <div key={plano.nome} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '10px',
                padding: '10px 14px',
              }}>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ color: 'white', fontSize: '13px', fontWeight: '600', margin: 0 }}>{plano.nome}</p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: 0 }}>{plano.consultas}</p>
                </div>
                <span style={{
                  color: '#06b6d4',
                  fontWeight: '700',
                  fontSize: '14px',
                }}>
                  {plano.preco}/mês
                </span>
              </div>
            ))}
          </div>

          <a
            href="https://wa.me/5548988311209?text=Quero+assinar+o+Agente+de+Viagens+IA"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              marginTop: '16px',
              padding: '12px',
              borderRadius: '12px',
              background: '#25d366',
              color: 'white',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            💬 Assinar pelo WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
