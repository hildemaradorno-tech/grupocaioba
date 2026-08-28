// Adapter único de IA para o módulo Auditoria Externa. Lê AI_PROVIDER (default
// 'gemini' — free tier via Google AI Studio, sem cartão de crédito) e a chave
// correspondente. Trocar para OpenAI/Anthropic pago no futuro é só mudar as
// env vars — nenhum código do módulo depende do provedor diretamente, todos
// chamam apenas chamarIA().

const PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase()

async function chamarGemini({ systemPrompt, userPrompt, jsonMode }) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada no backend. Gere uma chave grátis em https://aistudio.google.com/apikey')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
  const body = {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: jsonMode ? { responseMimeType: 'application/json' } : {},
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Gemini API respondeu ${res.status}: ${errText}`)
  }
  const data = await res.json()
  const texto = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || ''
  if (!texto) throw new Error('Gemini não retornou conteúdo.')
  return texto
}

async function chamarOpenAI({ systemPrompt, userPrompt, jsonMode }) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada no backend.')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`OpenAI API respondeu ${res.status}: ${errText}`)
  }
  const data = await res.json()
  const texto = data?.choices?.[0]?.message?.content || ''
  if (!texto) throw new Error('OpenAI não retornou conteúdo.')
  return texto
}

async function chamarAnthropic({ systemPrompt, userPrompt }) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada no backend.')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Anthropic API respondeu ${res.status}: ${errText}`)
  }
  const data = await res.json()
  const texto = data?.content?.map(c => c.text).join('') || ''
  if (!texto) throw new Error('Anthropic não retornou conteúdo.')
  return texto
}

/**
 * Chama o provedor de IA configurado. Retorna o texto bruto da resposta —
 * se jsonMode=true, o chamador deve fazer JSON.parse() (Gemini/OpenAI já
 * retornam JSON válido nesse modo; Anthropic ainda não tem esse recurso
 * nativo, então o systemPrompt deve pedir JSON explicitamente).
 */
export async function chamarIA({ systemPrompt, userPrompt, jsonMode = false }) {
  if (PROVIDER === 'openai') return chamarOpenAI({ systemPrompt, userPrompt, jsonMode })
  if (PROVIDER === 'anthropic') return chamarAnthropic({ systemPrompt, userPrompt, jsonMode })
  return chamarGemini({ systemPrompt, userPrompt, jsonMode })
}
