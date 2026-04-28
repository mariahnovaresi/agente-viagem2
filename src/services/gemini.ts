import { GoogleGenAI, Type } from "@google/genai";
import { FlightResult, FlightSearchData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function searchFlights(data: FlightSearchData & { flexMonths?: string[] }): Promise<FlightResult[]> {
  const hasFlexMonths = data.flexMonths && data.flexMonths.length > 0;

  // Build month names for prompt
  const monthNames: Record<string, string> = {
    '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
    '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
    '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
  };
  const flexMonthLabels = hasFlexMonths
    ? data.flexMonths!.map(m => monthNames[m] || m).join(', ')
    : '';

  const prompt = `
    Você é um especialista em passagens aéreas. Pesquise passagens REAIS e ATUAIS para os seguintes critérios:
    - Opção de busca: ${data.option}
    - Origem: ${data.origin}
    - Destino: ${data.destination || "Qualquer lugar"}
    - Data de Ida: ${hasFlexMonths ? `Flexível dentro dos meses: ${flexMonthLabels}` : (data.departureDate || "Flexível")}
    - Data de Volta: ${hasFlexMonths ? `Flexível dentro dos meses: ${flexMonthLabels}` : (data.returnDate || "Flexível")}
    - Visualização: ${data.view}
    - Duração da viagem: ${data.duration === 'flexivel' ? 'Flexível' : data.duration === 'fixed' ? 'Datas Exatas' : data.duration + ' dias'}

    Regras CRÍTICAS:
    1. Use a ferramenta de busca do Google para encontrar preços REAIS. Priorize sites oficiais das companhias aéreas (LATAM, GOL, Azul, TAP, etc).
    2. Se não encontrar o preço diretamente no site oficial, você PODE usar informações de agregadores confiáveis (Skyscanner, Google Flights) para identificar o valor, mas o LINK final deve preferencialmente levar ao site da companhia ou ao buscador oficial.
    3. Retorne preços em Reais (BRL) e/ou Milhas (Smiles, TudoAzul, LATAM Pass) conforme solicitado.
    4. Retorne APENAS informações reais e atuais.
    5. FILTRO ESTRITO: Se o destino foi especificado (${data.destination || "não"}), retorne APENAS voos para esse destino exato. Se apenas a origem foi especificada (${data.origin}), retorne APENAS voos partindo dessa origem exata.
    ${hasFlexMonths ? `
    6. MESES FLEXÍVEIS (PRIORIDADE MÁXIMA): O usuário quer ver MÚLTIPLAS opções de viagem com ida E volta DENTRO dos meses: ${flexMonthLabels}.
       - Isso significa: encontre viagens onde a ida E a volta acontecem dentro desses meses.
       - Exemplo correto: ida 10/05 volta 17/05, ida 03/06 volta 10/06, ida 28/05 volta 04/06 — TODOS são válidos.
       - Exemplo ERRADO: ida 10/05 volta 20/06 (isso seria uma viagem de 40 dias, não é o que se quer).
       - Retorne pelo menos 3 opções diferentes espalhadas pelos meses selecionados, mostrando variedade de datas.
       - A duração de cada viagem deve ser razoável (normalmente 5 a 15 dias), não o período inteiro dos meses.
       - NÃO interprete os meses como "ida no primeiro mês, volta no último mês".
    ` : `
    6. DATAS FIXAS (PRIORIDADE MÁXIMA): Se as datas de ida e volta foram informadas (${data.departureDate} a ${data.returnDate}), você deve buscar EXATAMENTE por essas datas. Ignore qualquer cálculo de duração ou intervalo. Se não houver voo exatamente nessas datas, retorne um array vazio []. É PROIBIDO sugerir outras datas.
    7. DATAS FLEXÍVEIS: Se a duração for informada como 'flexivel' ou se apenas a origem for dada, procure as melhores ofertas em um intervalo de 30 dias a partir de hoje, respeitando a duração de ${data.duration === 'fixed' ? 'não aplicável' : data.duration} dias se informada.
    `}

    IMPORTANTE: Se não encontrar NENHUM voo real que atenda aos critérios, retorne um array vazio []. Não invente dados.
    IMPORTANTE: Não invente preços. Se um preço em milhas não estiver disponível, deixe nulo.

    Retorne uma lista de até 20 opções no formato JSON.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            airline: { type: Type.STRING },
            origin: { type: Type.STRING },
            destination: { type: Type.STRING },
            departureDate: { type: Type.STRING },
            returnDate: { type: Type.STRING },
            priceCurrency: { type: Type.NUMBER },
            priceMiles: { type: Type.NUMBER },
            link: { type: Type.STRING },
            durationDays: { type: Type.NUMBER }
          },
          required: ["airline", "origin", "destination", "departureDate", "returnDate", "link", "durationDays"]
        }
      }
    }
  });

  try {
    const results = JSON.parse(response.text || "[]");
    return results;
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return [];
  }
}
