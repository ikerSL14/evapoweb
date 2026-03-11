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

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Creamos el cliente con opciones globales para asegurar que la apikey viaje siempre
const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { 'apikey': SUPABASE_ANON_KEY },
      },
    }) 
  : null;


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
    if (!supabase) {
        console.error("El cliente de Supabase no se inicializó.");
        throw new Error("Error de configuración de servidor");
    }

    // 1. Detectar TODOS los años escritos en el prompt (la 'g' al final es clave para atrapar múltiples)
    const matchAños = input.match(/\b(19|20)\d{2}\b/g);
    // Usamos Set para quitar años duplicados si el usuario escribe "1998 vs 1998"
    let añosBuscados = matchAños ? [...new Set(matchAños.map(Number))] : []; 

    // 2. LÓGICA PREDICTIVA (El truco para 2026)
    const esPreguntaFuturo = añosBuscados.includes(2026) || input.toLowerCase().includes("este año");

    if (esPreguntaFuturo) {
        // Si no estaban ya, inyectamos los años de referencia
        if (!añosBuscados.includes(2025)) añosBuscados.push(2025);
        if (!añosBuscados.includes(2024)) añosBuscados.push(2024);
        
        // Eliminamos el 2026 de la búsqueda en BD porque sabemos que no existe aún
        añosBuscados = añosBuscados.filter(y => y !== 2026);
    }

    const textoInput = input.toLowerCase();
    const esComparacion = textoInput.includes("compar") || textoInput.includes("vs");
    const pideReciente = textoInput.includes("reciente") || textoInput.includes("actual");

    // 2. Truco Jedi: Si compara 1 año contra "el más reciente", inyectamos 2025 artificialmente
    if (esComparacion && añosBuscados.length === 1 && pideReciente) {
        añosBuscados.push(2025); // Forzamos a que busque también en los datos actuales
    }

    let contextoFinal = [];
    let intentos = 0;
    const maxIntentos = 2;

    while (intentos < maxIntentos) {
        try {
            if (añosBuscados.length > 0) {
                // 🚀 BÚSQUEDA PARALELA: Disparamos una consulta a la BD por CADA año
                const promesas = añosBuscados.map(año => 
                    supabase.rpc('buscar_evapo_openai', {
                        query_embedding: embedding,
                        match_threshold: 0.2,
                        match_count: 100, // 100 espacios garantizados para CADA AÑO
                        target_year: año
                    })
                );
                
                const resultados = await Promise.all(promesas);
                
                // Juntamos los datos de todos los años en un solo arreglo
                for (const res of resultados) {
                    if (res.error) throw res.error;
                    if (res.data) contextoFinal.push(...res.data);
                }
            } else {
                // 🌎 Búsqueda General (Cuando pregunta "¿Mejor época?" sin dar años)
                const { data, error: dbError } = await supabase.rpc('buscar_evapo_openai', {
                    query_embedding: embedding,
                    match_threshold: 0.2,
                    match_count: 200, // Mochila más grande
                    target_year: null
                });
                if (dbError) throw dbError;
                contextoFinal = data;
            }
            break; // Si tiene éxito, salimos del bucle
        } catch (e) {
            intentos++;
            if (intentos >= maxIntentos) throw e;
            console.warn(`Intento ${intentos} fallido, reintentando...`);
            await new Promise(res => setTimeout(res, 1000));
        }
    }

    // 3. Filtrado ultra-seguro (usamos contextoFinal en lugar de contexto)
    const contextoTexto = contextoFinal
        ?.filter(c => {
            const tieneCero = /\b0\.0+\b/.test(c.descripcion); 
            return !tieneCero;
        })
        .map(c => `- ${c.descripcion}`)
        .join('\n');

    // 4. Validación de seguridad: ¿Qué pasa si después de filtrar no queda nada?
    if (!contextoTexto || contextoTexto.trim() === "") {
        // Si no hay datos reales, le avisamos a la Worker de forma explícita
        const resFinal = await fetch("https://shrill-shape-31e8.ikersalazarliev.workers.dev", {
            method: "POST",
            body: JSON.stringify({ 
                prompt: input, 
                contextoTexto: "SISTEMA: No se encontraron registros válidos (mayores a 0) para este periodo en la base de datos." 
            })
        });
        const { respuesta } = await resFinal.json();
        setMessages(prev => [...prev, { role: 'bot', content: respuesta }]);
        return; // Salimos de la función
    }

    // 5. Llamada final normal (si hay contexto válido)
    const resFinal = await fetch("https://shrill-shape-31e8.ikersalazarliev.workers.dev", {
        method: "POST",
        body: JSON.stringify({ prompt: input, contextoTexto })
    });

    const { respuesta } = await resFinal.json();

    setMessages(prev => [...prev, { role: 'bot', content: respuesta }]);
  } catch (err) {
    console.error(err);
    const mensajeError = err.message || "Error desconocido";
    setMessages(prev => [...prev, { role: 'bot', content: `⚠️ Error técnico: ${mensajeError}. Por favor, intenta de nuevo.` }]);
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

    // 2. Buscamos el año más alto para la selección inicial
    // Usamos Math.max para no depender del orden del array
    const maxYear = Math.max(...series.map(s => s.YEAR));
    const seriesDelMaxAño = series.filter(s => s.YEAR === maxYear);
    const minMonth = Math.min(...seriesDelMaxAño.map(s => s.Month));

    let year = selectedYear ?? maxYear;
    let month = selectedMonth ?? minMonth;
    
    let found = series.find(s => s.YEAR === year && s.Month === month);

    if (!found) { 
      found = seriesDelMaxAño[0] || series[series.length - 1];
      year = found?.YEAR; 
      month = found?.Month; 
    }

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
<div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">

{/* NAVBAR */}
<header className="h-16 border-b border-slate-800 bg-slate-900/70 backdrop-blur sticky top-0 z-50">
  <div className="max-w-[1800px] mx-auto h-full flex items-center px-6">
    
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-blue-500/10">
        <CloudRain className="w-6 h-6 text-blue-400"/>
      </div>

      <span className="font-semibold text-lg tracking-wide text-blue-300">
        HydroFlow Precision
      </span>
    </div>

  </div>
</header>


{/* DASHBOARD */}
<div className="
flex-1
grid
grid-cols-1
lg:grid-cols-[280px_1fr_280px]
xl:grid-cols-[320px_1fr_320px]
gap-6
p-4
lg:p-6
max-w-[1800px]
mx-auto
w-full
min-h-0
">

{/* CHAT PANEL */}
<div className="
hidden
lg:flex
flex-col
bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden
">

  <div className="p-4 border-b border-slate-800 flex items-center gap-2">
    <Bot size={18}/>
    <span className="font-semibold text-sm">Asistente IA</span>
  </div>

  <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-minimal">
    {messages.map((m,i)=>(
      <div
        key={i}
        className={`flex ${m.role==="user" ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`p-3 rounded-xl text-sm max-w-[85%] break-words ${
            m.role==="user" ? "bg-blue-600" : "bg-slate-800"
          }`}
        >
          <div className="markdown-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {m.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    ))}

    {isSearching && (
      <div className="flex justify-start animate-pulse">
        <div className="bg-slate-700/50 p-3 rounded-xl text-xs text-blue-300 flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
          Buscando en la base de datos de Tabasco...
        </div>
      </div>
    )}

    <div ref={scrollRef}/>
  </div>

  <div className="p-3 border-t border-slate-800 flex gap-2">
    <input
      value={input}
      onChange={(e)=>setInput(e.target.value)}
      onKeyDown={(e)=>e.key==="Enter" && handleSendMessage()}
      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none"
      placeholder="Pregunta sobre clima o siembra..."
    />
    <button
      onClick={handleSendMessage}
      className="bg-blue-600 p-2 rounded-lg hover:bg-blue-500 transition"
    >
      <Send size={16}/>
    </button>
  </div>

</div>
<button
onClick={()=>setIsChatOpen(true)}
className="z-50 lg:hidden fixed bottom-6 right-6 bg-blue-600 p-4 rounded-full shadow-xl"
>
<MessageCircle size={20}/>
</button>
{isChatOpen && (
<div className="fixed inset-0 bg-black/60 backdrop-blur z-50 flex lg:hidden">

<div className="w-full bg-slate-900 h-full flex flex-col">

<div className="p-4 border-b border-slate-800 flex justify-between items-center">
<span className="font-semibold">Asistente IA</span>

<button onClick={()=>setIsChatOpen(false)}>
<X/>
</button>
</div>

<div className="flex-1 overflow-y-auto p-4 space-y-4">

{messages.map((m,i)=>(
<div
key={i}
className={`flex ${m.role==="user" ? "justify-end" : "justify-start"}`}
>
<div
className={`p-3 rounded-xl text-sm max-w-[85%] break-words ${
m.role==="user" ? "bg-blue-600" : "bg-slate-800"
}`}
>
<ReactMarkdown remarkPlugins={[remarkGfm]}>
{m.content}
</ReactMarkdown>
</div>
</div>
))}

{isSearching && (
<div className="flex justify-start animate-pulse">
<div className="bg-slate-700/50 p-3 rounded-xl text-xs text-blue-300">
Buscando en la base de datos...
</div>
</div>
)}

</div>

<div className="p-3 border-t border-slate-800 flex gap-2">

<input
value={input}
onChange={(e)=>setInput(e.target.value)}
onKeyDown={(e)=>e.key==="Enter" && handleSendMessage()}
className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm"
placeholder="Pregunta..."
/>

<button
onClick={handleSendMessage}
className="bg-blue-600 p-2 rounded-lg"
>
<Send size={16}/>
</button>

</div>

</div>
</div>
)}


{/* MAPA + GRÁFICA */}
<div className="
order-1
lg:order-2
flex flex-col gap-6 min-w-0 min-h-0
">

  <div className="h-[55vh] lg:flex-[1.5] lg:h-auto bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
    {loading
      ? <div className="p-6">Cargando mapa...</div>
      : <MapaET
          data={data}
          onPointClick={handlePointClick}
          selectedCoords={selectedPoint ? { LAT:selectedPoint.LAT, LON:selectedPoint.LON } : null}
        />
    }
  </div>

  <div className="h-[35vh] lg:flex-[1] lg:h-auto min-w-0 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
    <GraficaMensual series={seriesForPlot}/>
  </div>

</div>


{/* PANEL DATOS */}
<div className="
order-2
lg:order-3
bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden
">

{selectedPoint ? (
  <PanelDatos
    selectedPoint={selectedPoint}
    selectedYear={selectedYear}
    selectedMonth={selectedMonth}
    onChangeDate={handleChangeDate}
  />
) : (
  <div className="p-6 text-gray-400">
    Selecciona un punto del mapa.
  </div>
)}

</div>

</div>

</div>
);
}
