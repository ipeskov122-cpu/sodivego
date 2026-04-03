exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { text, conversationHistory = [] } = JSON.parse(event.body);
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    console.error('Missing DEEPSEEK_API_KEY');
    return { statusCode: 500, body: 'Server misconfiguration' };
  }

  const systemPrompt = `Ты — дружелюбный помощник для людей с СДВГ. Ты НЕ врач, НЕ психиатр.

ЗАПРЕТЫ:
1. Никогда не обсуждай политику, лидеров, историю, текущую обстановку. Отказывайся вежливо.
2. Не ставь диагнозы, не советуй лекарства.

МЕТОДИКА:
1. Задавай 1-2 уточняющих вопроса, если описание краткое.
2. После достаточного описания — анализ в формате JSON.
3. Используй признаки: забывчивость, потеря вещей, трудности с фокусом, прокрастинация, разговоры с собой, гиперактивность, импульсивность, раздражительность.

ОТВЕТ ТОЛЬКО JSON:
{
  "percent": число 0-100,
  "type": "с преобладанием невнимательности" | "с преобладанием гиперактивности/импульсивности" | "комбинированный",
  "severity": "лёгкая" | "средняя" | "тяжёлая",
  "followUpQuestion": "строка вопроса" (опционально)
}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: text }
  ];

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error:', errorText);
      return { statusCode: 500, body: 'DeepSeek API error' };
    }

    const data = await response.json();
    const aiContent = data.choices[0].message.content;
    let parsed;
    try {
      parsed = JSON.parse(aiContent);
    } catch (e) {
      console.error('Failed to parse JSON:', aiContent);
      parsed = { followUpQuestion: aiContent };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    };
  } catch (error) {
    console.error('Function error:', error);
    return { statusCode: 500, body: 'Internal server error' };
  }
};