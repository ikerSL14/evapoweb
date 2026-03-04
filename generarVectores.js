import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://odufpumbiggqvkqbnghn.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kdWZwdW1iaWdncXZrcWJuZ2huIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ3Mjg0MywiZXhwIjoyMDg4MDQ4ODQzfQ.Nz_IcDthhDP7l0b2oMIV3nmWrquq2o9xEFbeKgQ_8Ss'; 
const GEMINI_API_KEY = 'AIzaSyBwOFtd-8sOu-NPfAw7Fbn39iKxhzfY6So'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Función para pausar el script
const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function generarEmbeddings() {
  console.log('--- 🔍 Buscando filas pendientes en Supabase ---');

  // Traemos un bloque de 500 filas para procesar
  const { data: filas, error } = await supabase
    .from('datos_evapo')
    .select('id, descripcion')
    .is('embedding', null)
    .limit(500); 

  if (error) {
    console.error('❌ Error al obtener datos de Supabase:', error.message);
    return;
  }

  if (!filas || filas.length === 0) {
    console.log('✅ ¡PROCESO COMPLETADO! No quedan filas pendientes.');
    return;
  }

  console.log(`🚀 Iniciando bloque de ${filas.length} filas...`);

  for (const fila of filas) {
    try {
      if (!fila.descripcion) {
        console.log(`⚠️ Saltando ID ${fila.id}: Sin descripción.`);
        continue;
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`;
      
      const resEmbed = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text: fila.descripcion }] },
          outputDimensionality: 768 
        })
      });

      const embedData = await resEmbed.json();

      // MANEJO DE CUOTA (Error 429)
      if (resEmbed.status === 429 || embedData.error?.message?.includes('quota')) {
        console.log("⏳ Cuota excedida. Esperando 60 segundos para reintentar...");
        await delay(60000); // Pausa larga de 1 minuto
        // No avanzamos a la siguiente fila, reintentamos esta misma en la siguiente iteración
        return generarEmbeddings(); 
      }

      if (embedData.error) {
        console.error(`❌ Error API en ID ${fila.id}: ${embedData.error.message}`);
        continue;
      }

      const embedding = embedData.embedding.values; 

      const { error: updateError } = await supabase
        .from('datos_evapo')
        .update({ embedding: embedding })
        .eq('id', fila.id);

      if (updateError) throw updateError;

      console.log(`✅ ID ${fila.id} vectorizado con éxito.`);
      
      // PAUSA DE SEGURIDAD: 1.2 segundos entre peticiones para no saturar
      await delay(1200); 
      
    } catch (err) {
      console.error(`❌ Fallo crítico en ID ${fila.id}:`, err.message);
      // Esperamos un poco antes de seguir tras un error inesperado
      await delay(5000);
    }
  }

  // Al terminar las 500 filas, llamamos de nuevo a la función para ver si hay más
  console.log('--- 🔄 Bloque terminado. Verificando si quedan más pendientes... ---');
  return generarEmbeddings();
}

// Iniciar el motor
generarEmbeddings();