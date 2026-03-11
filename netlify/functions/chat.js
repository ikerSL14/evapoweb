export async function handler(event) {

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders
    };
  }

  try {

    const { prompt, contextoTexto } = JSON.parse(event.body);

    const promptMejorado = prompt;

    // EMBEDDING
    const resEmbed = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        input: promptMejorado,
        model: "text-embedding-3-small"
      })
    });

    const embedData = await resEmbed.json();
    const embedding = embedData.data[0].embedding;

    // CHAT COMPLETION
    const resChat = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Eres el Asistente Experto en Agrometeorología especializado en Tabasco.

CONTEXTO HISTÓRICO:
${contextoTexto}`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2
      })
    });

    const chatData = await resChat.json();

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        embedding,
        respuesta: chatData.choices[0].message.content
      })
    };

  } catch (error) {

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: error.message
      })
    };

  }
}