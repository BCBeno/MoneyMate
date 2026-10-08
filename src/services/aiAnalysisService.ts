import Constants from 'expo-constants';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const MODEL = 'gemini-3.5-flash-lite';
const REQUEST_TIMEOUT_MS = 45_000;

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
  const extra = Constants.expoConfig?.extra;
  const key = (extra?.geminiApiKey as string | undefined)?.trim()
    || (extra?.openRouterApiKey as string | undefined)?.trim();
  if (!key) {
    throw new Error('Gemini API key not configured. Set GEMINI_API_KEY and restart the app.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: buildPrompt(input) }],
        max_tokens: 2048,
        reasoning_effort: 'low',
        temperature: 0.7,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'spending_analysis',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                analysis: { type: 'string' },
                tip: { type: 'string' },
              },
              required: ['analysis', 'tip'],
              additionalProperties: false,
            },
          },
        },
      }),
    });

    const json = await response.json().catch(() => null);
    if (!response.ok) {
      const message = typeof json?.error?.message === 'string'
        ? json.error.message.split(key).join('[redacted]')
        : response.statusText || 'Request failed.';
      throw new Error(`Gemini API error (${response.status}): ${message}`);
    }

    const choice = json?.choices?.[0];
    if (choice?.finish_reason === 'length') {
      throw new Error('Gemini response was incomplete. Please try again.');
    }
    const content = choice?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('Gemini returned an empty response. Please try again.');
    }

    return parseResponse(content);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('Gemini request timed out. Please try again.');
    }
    if (error instanceof TypeError) {
      throw new Error('Could not connect to Gemini. Check your internet connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
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

Reply with a JSON object containing exactly these two string fields (no markdown):
"analysis": 3-4 sentences about current spending patterns${previous ? ', compared to the same period last month,' : ''} projected budget impact based on current trajectory, days remaining, and specific budget management recommendations to optimize spending for the rest of the month. Reference specific numbers and categories.
"tip": One actionable tip starting with a verb, based on the biggest spending category, most notable pattern, or budget adjustment needed for remaining days.`;

  return prompt;
}

function parseResponse(raw: string): AnalysisResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
  } catch {
    throw new Error('Gemini returned an invalid analysis. Please try again.');
  }

  if (!parsed || typeof parsed !== 'object'
    || !('analysis' in parsed) || typeof parsed.analysis !== 'string' || !parsed.analysis.trim()
    || !('tip' in parsed) || typeof parsed.tip !== 'string') {
    throw new Error('Gemini returned an invalid analysis. Please try again.');
  }

  return {
    analysis: parsed.analysis.trim(),
    tip: parsed.tip.trim(),
  };
}
