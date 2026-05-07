import Constants from 'expo-constants';

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
  const key = Constants.expoConfig?.extra?.openRouterApiKey as string | undefined;
  if (!key?.trim()) {
    throw new Error('OpenRouter API key not configured.');
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
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  // Calculate days remaining in month
  const currentDate = new Date();
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const dayOfMonth = currentDate.getDate();
  const daysRemaining = daysInMonth - dayOfMonth;
  const daysElapsed = dayOfMonth;
  
  // Calculate spending rate and projections
  const dailySpendingRate = daysElapsed > 0 ? current.totalExpenses / daysElapsed : 0;
  const projectedMonthExpenses = dailySpendingRate * daysInMonth;
  const projectedMonthNet = current.totalIncome - projectedMonthExpenses;
  const dailyBudgetRemaining = daysRemaining > 0 ? net / daysRemaining : 0;

  let prompt = `You are a personal finance assistant. Analyze spending data and be specific with numbers. Reply entirely in ${language}.

TODAY: ${today}
MONTH PROGRESS: Day ${dayOfMonth} of ${daysInMonth} (${daysRemaining} days remaining)

CURRENT MONTH: ${current.label} (data through today)
Income: ${current.totalIncome.toFixed(2)} ${currency}
Expenses: ${current.totalExpenses.toFixed(2)} ${currency}
Net: ${net.toFixed(2)} ${currency} (savings rate: ${savingsRate.toFixed(1)}%)
Spending by category:
${current.categories.map(c => `  - ${c.name}: ${c.amount.toFixed(2)} ${currency} (${c.pct.toFixed(1)}%)`).join('\n') || '  - No expenses recorded'}

BUDGET MANAGEMENT:
Daily spending rate: ${dailySpendingRate.toFixed(2)} ${currency}/day
Projected month-end expenses: ${projectedMonthExpenses.toFixed(2)} ${currency}
Projected month-end net: ${projectedMonthNet.toFixed(2)} ${currency}
Daily budget remaining: ${dailyBudgetRemaining.toFixed(2)} ${currency}/day`;

  if (previous) {
    // Compare same period: first daysElapsed of current month vs first daysElapsed of previous month
    const prevDailySpendingRate = previous.totalExpenses / previous.categories.length > 0 ? 
      previous.totalExpenses / new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate() : 0;
    const prevSamePeriodExpenses = (previous.totalExpenses / new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate()) * daysElapsed;
    const prevSamePeriodIncome = (previous.totalIncome / new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate()) * daysElapsed;
    const prevSamePeriodNet = prevSamePeriodIncome - prevSamePeriodExpenses;
    
    const expChange = current.totalExpenses - prevSamePeriodExpenses;
    const expChangePct = prevSamePeriodExpenses > 0 ? (expChange / prevSamePeriodExpenses) * 100 : 0;
    
    // Scale categories proportionally for same period comparison
    const prevCategoriesSamePeriod = previous.categories.map(c => ({
      ...c,
      amount: (c.amount / new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate()) * daysElapsed
    }));

    prompt += `

SAME PERIOD LAST MONTH: ${previous.label} (first ${daysElapsed} days)
Income: ${prevSamePeriodIncome.toFixed(2)} ${currency}
Expenses: ${prevSamePeriodExpenses.toFixed(2)} ${currency}
Net: ${prevSamePeriodNet.toFixed(2)} ${currency}
Same-period expense change: ${expChange >= 0 ? '+' : ''}${expChange.toFixed(2)} ${currency} (${expChangePct >= 0 ? '+' : ''}${expChangePct.toFixed(1)}%)
${prevCategoriesSamePeriod.map(c => `  - ${c.name}: ${c.amount.toFixed(2)} ${currency} (${c.pct.toFixed(1)}%)`).join('\n') || '  - No expenses recorded'}`;
  } else {
    prompt += `

NOTE: No previous month data available for comparison. Enable the compare toggle to see year-over-year analysis.`;
  }

  prompt += `

Reply in exactly this format (no markdown, plain text only):
ANALYSIS: [3-4 sentences about current spending patterns${previous ? ', compared to the same period last month,' : ''} projected budget impact based on current trajectory, days remaining, and specific budget management recommendations to optimize spending for the rest of the month. Reference specific numbers and categories.]

TIP: [One actionable tip starting with a verb, based on the biggest spending category, most notable pattern, or budget adjustment needed for remaining days.]`;

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
