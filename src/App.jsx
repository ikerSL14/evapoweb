'use client';
import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';
import useETdata from "./hooks/useETdata";
import MapaET from "./components/MapaET";
import GraficaMensual from "./components/GraficaMensual";
import PanelDatos from "./components/PanelDatos";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './index.css';
// Añadimos iconos para el chat
import { CloudRain, MessageCircle, X, Send, Bot } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


export default function App() {
  const [isSearching, setIsSearching] = useState(false);
  const { data, loading } = useETdata();
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);

  // --- ESTADOS PARA EL CHAT ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', content: '¡Hola! Soy tu asistente de Cárdenas. Pregúntame sobre cuándo sembrar o extraer hule.' }
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Agrega esto al inicio de tu handleSendMessage
const handleSendMessage = async () => {
  if (!input.trim()) return;
  setIsSearching(true);
  
  const userMsg = { role: 'user', content: input };
  setMessages(prev => [...prev, userMsg]);
  setInput('');

  try {
    // LLAMADA ÚNICA A LA WORKER (Ella vectoriza y prepara el chat)
    const resWorker = await fetch("https://shrill-shape-31e8.ikersalazarliev.workers.dev", {
      method: "POST",
      body: JSON.stringify({ prompt: input, contextoTexto: "" }) // Primero pedimos embedding
    });
    
    const { embedding } = await resWorker.json();

    // PASO 2: Supabase (Esto sí puede seguir en el frontend porque la Anon Key es pública)
    const { data: contexto, error: dbError } = await supabase.rpc('buscar_evapo_openai', {
      query_embedding: embedding,
      match_threshold: 0.3,
      match_count: 200
    });

    if (dbError) throw dbError;

    const contextoTexto = contexto?.map(c => `- ${c.descripcion}`).join('\n');

    // LLAMADA FINAL A LA WORKER (Ahora con el contexto para la respuesta final)
    const resFinal = await fetch("https://shrill-shape-31e8.ikersalazarliev.workers.dev", {
      method: "POST",
      body: JSON.stringify({ prompt: input, contextoTexto })
    });

    const { respuesta } = await resFinal.json();

    setMessages(prev => [...prev, { role: 'bot', content: respuesta }]);
  } catch (err) {
    console.error(err);
    setMessages(prev => [...prev, { role: 'bot', content: "Error de conexión segura." }]);
  } finally {
    setIsSearching(false);
  }
};
  // ----------------------------

  const handlePointClick = (p) => {
    if (!p) return;
    const series = (p.items || [])
      .map(it => ({ ...it, YEAR: Number(it.YEAR), Month: Number(it.Month) }))
      .sort((a, b) => a.YEAR - b.YEAR || a.Month - b.Month);

    let year = selectedYear ?? series[0]?.YEAR;
    let month = selectedMonth ?? series[0]?.Month;
    let found = series.find(s => s.YEAR === year && s.Month === month);

    if (!found) { found = series[0]; year = found.YEAR; month = found.Month; }

    setSelectedYear(year);
    setSelectedMonth(month);
    setSelectedPoint({ ...found, LAT: p.LAT, LON: p.LON, series });
  };

  const handleChangeDate = useCallback((year, month) => {
    if (!selectedPoint?.series) return;
    const found = selectedPoint.series.find(s => s.YEAR === year && s.Month === month);
    if (!found) return;
    setSelectedYear(year);
    setSelectedMonth(month);
    setSelectedPoint(prev => ({ ...found, LAT: prev.LAT, LON: prev.LON, series: prev.series }));
  }, [selectedPoint]);

  const seriesForPlot = useMemo(() => {
    if (!selectedPoint?.series) return [];
    return selectedPoint.series.map((s) => ({
      YEAR: s.YEAR, Month: s.Month, Mes: s.Mes,
      ET: Number(s.ET_CALCULADA), label: `${s.YEAR}-${s.Mes}`,
    }));
  }, [selectedPoint]);

  return (
    <div className="min-h-screen p-6 bg-slate-900 text-slate-100 relative">
      {/* Tu contenido actual */}
      <div className="max-w-[1400px] mx-auto mb-6">
        <div className="p-4 flex flex-col sm:flex-row items-center sm:justify-between gap-2 bg-slate-800/60 rounded-2xl shadow">
          <h1 className="flex items-center gap-3 text-xl font-bold text-blue-300">
            <span className="p-2 rounded-lg bg-blue-500/10">
              <CloudRain className="w-5 h-5 text-blue-400" />
            </span>
            Sistema de visualización de Evapotranspiración
          </h1>
          <div className="text-sm text-gray-400">Fuente: NASA POWER • CSV local</div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/60 rounded-2xl shadow order-2 lg:order-1">
          {selectedPoint ? (
            <PanelDatos selectedPoint={selectedPoint} selectedYear={selectedYear} selectedMonth={selectedMonth} onChangeDate={handleChangeDate} />
          ) : (
            <div className="p-4 text-gray-400">Selecciona un punto en el mapa.</div>
          )}
        </div>
        <div className="bg-slate-800/60 rounded-2xl shadow h-[463px] order-1 lg:order-2">
          {loading ? <div className="p-4">Cargando...</div> : <MapaET data={data} onPointClick={handlePointClick} selectedCoords={selectedPoint ? { LAT: selectedPoint.LAT, LON: selectedPoint.LON } : null} />}
        </div>
        <div className="lg:col-span-2 bg-slate-800/60 rounded-2xl shadow h-[260px] order-3">
          <GraficaMensual series={seriesForPlot} />
        </div>
      </div>

      {/* --- BOTÓN FLOTANTE Y VENTANA DE CHAT --- */}
      <div className="fixed bottom-6 right-6 z-[2000]">
        {isChatOpen && (
          <div className="absolute bottom-16 right-0 w-[350px] h-[450px] bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="p-4 bg-blue-600 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bot size={20} />
                <span className="font-bold text-sm">Asistente IA</span>
              </div>
              <button onClick={() => setIsChatOpen(false)}><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-xl text-sm max-w-[85%] overflow-hidden ${m.role === 'user' ? 'bg-blue-500' : 'bg-slate-700'}`}>
                    {/* Removemos el className de ReactMarkdown y lo ponemos en un div que lo envuelva */}
                    <div className="markdown-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}

              {/* PASO C: Indicador de búsqueda */}
                {isSearching && (
                  <div className="flex justify-start animate-pulse">
                    <div className="bg-slate-700/50 p-3 rounded-xl text-xs text-blue-300 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                      Buscando en la base de datos de Tabasco...
                    </div>
                  </div>
                )}
              <div ref={scrollRef} />
            </div>
            <div className="p-3 border-t border-slate-700 bg-slate-800 flex gap-2">
              <input 
                value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none"
                placeholder="Escribe tu duda..."
              />
              <button onClick={handleSendMessage} className="bg-blue-600 p-2 rounded-lg hover:bg-blue-500 transition">
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
        
        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="p-4 bg-blue-600 rounded-full shadow-lg hover:bg-blue-500 transition-all hover:scale-110 active:scale-95"
        >
          {isChatOpen ? <X size={24} /> : <MessageCircle size={24} />}
        </button>
      </div>
    </div>
  );
}
