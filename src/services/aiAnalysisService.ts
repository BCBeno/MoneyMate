const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openai/gpt-5.4-mini';

export interface CategoryData {
  name: string;
  icon: string;
  amount: number;
  pct: number;
}

export interface MonthAnalysisData {
  label: string;
  totalExpenses: number;
  totalIncome: number;
  categories: CategoryData[];
}

export interface AnalysisInput {
  current: MonthAnalysisData;
  previous?: MonthAnalysisData;
  currency: string;
  language: string;
}

export interface AnalysisResult {
  analysis: string;
  tip: string;
}

export async function analyzeSpending(input: AnalysisInput): Promise<AnalysisResult> {
  const key = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
  if (!key?.trim()) {
    throw new Error('OpenRouter API key not set. Add EXPO_PUBLIC_OPENROUTER_API_KEY to your .env file.');
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key.trim()}`,
      'HTTP-Referer': 'https://moneymate.app',
      'X-Title': 'MoneyMate',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: buildPrompt(input) }],
      max_tokens: 600,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`API error (${response.status}): ${errText || response.statusText}`);
  }

  const json = await response.json();
  const content: string = json.choices?.[0]?.message?.content ?? '';
  if (!content) throw new Error('Empty response from AI.');

  return parseResponse(content);
}

function buildPrompt(input: AnalysisInput): string {
  const { current, previous, currency, language } = input;
  const net = current.totalIncome - current.totalExpenses;
  const savingsRate = current.totalIncome > 0 ? (net / current.totalIncome) * 100 : 0;

  let prompt = `You are a personal finance assistant. Analyze spending data and be specific with numbers. Reply entirely in ${language}.

CURRENT MONTH: ${current.label}
Income: ${current.totalIncome.toFixed(2)} ${currency}
Expenses: ${current.totalExpenses.toFixed(2)} ${currency}
Net: ${net.toFixed(2)} ${currency} (savings rate: ${savingsRate.toFixed(1)}%)
Spending by category:
${current.categories.map(c => `  - ${c.name}: ${c.amount.toFixed(2)} ${currency} (${c.pct.toFixed(1)}%)`).join('\n') || '  - No expenses recorded'}`;

  if (previous) {
    const expChange = current.totalExpenses - previous.totalExpenses;
    const expChangePct = previous.totalExpenses > 0 ? (expChange / previous.totalExpenses) * 100 : 0;
    const prevNet = previous.totalIncome - previous.totalExpenses;

    prompt += `

PREVIOUS MONTH: ${previous.label}
Income: ${previous.totalIncome.toFixed(2)} ${currency}
Expenses: ${previous.totalExpenses.toFixed(2)} ${currency}
Net: ${prevNet.toFixed(2)} ${currency}
Month-over-month expense change: ${expChange >= 0 ? '+' : ''}${expChange.toFixed(2)} ${currency} (${expChangePct >= 0 ? '+' : ''}${expChangePct.toFixed(1)}%)
Previous spending by category:
${previous.categories.map(c => `  - ${c.name}: ${c.amount.toFixed(2)} ${currency} (${c.pct.toFixed(1)}%)`).join('\n') || '  - No expenses recorded'}`;
  }

  prompt += `

Reply in exactly this format (no markdown, plain text only):
ANALYSIS: [3-4 sentences about spending patterns${previous ? ', month-over-month changes,' : ''} and financial health. Reference specific numbers and categories.]

TIP: [One actionable tip starting with a verb, based on the biggest spending category or most notable pattern.]`;

  return prompt;
}

function parseResponse(raw: string): AnalysisResult {
  const analysisMatch = raw.match(/ANALYSIS:\s*([\s\S]*?)(?=\n\nTIP:|$)/i);
  const tipMatch = raw.match(/TIP:\s*([\s\S]*?)$/i);
  return {
    analysis: analysisMatch?.[1]?.trim() ?? raw.trim(),
    tip: tipMatch?.[1]?.trim() ?? '',
  };
}
