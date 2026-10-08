import Constants from 'expo-constants';
import { analyzeSpending, type AnalysisInput } from '../aiAnalysisService';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: {} } },
}));

const extra = Constants.expoConfig!.extra!;
const input: AnalysisInput = {
  current: {
    label: 'October 2026',
    totalIncome: 1000,
    totalExpenses: 200,
    categories: [{ name: 'Food', icon: 'utensils', amount: 200, pct: 100 }],
  },
  currency: 'RON',
  language: 'Romanian',
};
const result = { analysis: 'Expenses are 200 RON.', tip: 'Plan your meals.' };
let mockFetch: jest.SpiedFunction<typeof fetch>;

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    json: async () => body,
  } as Response;
}

beforeEach(() => {
  jest.useFakeTimers();
  extra.geminiApiKey = ' test-gemini-key ';
  delete extra.openRouterApiKey;
  mockFetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(response({
    choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(result) } }],
  }));
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it('uses the complete Gemini endpoint, selected model and structured Romanian output', async () => {
  await expect(analyzeSpending(input)).resolves.toEqual(result);
  const [url, options] = mockFetch.mock.calls[0];
  expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
  expect(options?.headers).toEqual({
    'Content-Type': 'application/json',
    Authorization: 'Bearer test-gemini-key',
  });
  const body = JSON.parse(options!.body as string);
  expect(body.model).toBe('gemini-3.5-flash-lite');
  expect(body.messages[0].content).toContain('Reply entirely in Romanian');
  expect(body.messages[0].content).toContain('Food: 200.00 RON');
  expect(body.response_format.json_schema.schema.required).toEqual(['analysis', 'tip']);
  expect(jest.getTimerCount()).toBe(0);
});

it('keeps working with the API key field from an older Expo configuration', async () => {
  delete extra.geminiApiKey;
  extra.openRouterApiKey = 'legacy-gemini-key';
  await expect(analyzeSpending(input)).resolves.toEqual(result);
  expect(mockFetch.mock.calls[0][1]?.headers).toMatchObject({
    Authorization: 'Bearer legacy-gemini-key',
  });
});

it('reports a missing key before making a request', async () => {
  extra.geminiApiKey = ' ';
  await expect(analyzeSpending(input)).rejects.toThrow('Gemini API key not configured');
  expect(mockFetch).not.toHaveBeenCalled();
});

it('accepts JSON wrapped in a code fence and trims the displayed fields', async () => {
  mockFetch.mockResolvedValue(response({
    choices: [{ message: { content: '```json\n{"analysis":" Analysis ","tip":" Tip "}\n```' } }],
  }));
  await expect(analyzeSpending(input)).resolves.toEqual({ analysis: 'Analysis', tip: 'Tip' });
});

it.each([400, 403, 429])('shows the Gemini error for HTTP %s without exposing the key', async status => {
  mockFetch.mockResolvedValue(response({ error: { message: 'Rejected test-gemini-key' } }, status));
  await expect(analyzeSpending(input)).rejects.toThrow(`Gemini API error (${status}): Rejected [redacted]`);
  expect(jest.getTimerCount()).toBe(0);
});

it.each([undefined, null, '', '   '])('rejects empty response content (%s)', async content => {
  mockFetch.mockResolvedValue(response({ choices: [{ message: { content } }] }));
  await expect(analyzeSpending(input)).rejects.toThrow('Gemini returned an empty response');
});

it.each(['not JSON', '{"analysis":"","tip":"Tip"}', '{"analysis":"Analysis","tip":12}'])
('rejects a malformed structured analysis (%s)', async content => {
  mockFetch.mockResolvedValue(response({ choices: [{ message: { content } }] }));
  await expect(analyzeSpending(input)).rejects.toThrow('Gemini returned an invalid analysis');
});

it('rejects a truncated response instead of displaying partial advice', async () => {
  mockFetch.mockResolvedValue(response({
    choices: [{ finish_reason: 'length', message: { content: JSON.stringify(result) } }],
  }));
  await expect(analyzeSpending(input)).rejects.toThrow('Gemini response was incomplete');
});

it('reports connection failures and clears the timeout', async () => {
  mockFetch.mockRejectedValue(new TypeError('Network request failed'));
  await expect(analyzeSpending(input)).rejects.toThrow('Could not connect to Gemini');
  expect(jest.getTimerCount()).toBe(0);
});

it('aborts a stalled request and reports a timeout', async () => {
  mockFetch.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
  }));
  const pending = expect(analyzeSpending(input)).rejects.toThrow('Gemini request timed out');
  await jest.advanceTimersByTimeAsync(45_000);
  await pending;
  expect(mockFetch.mock.calls[0][1]?.signal?.aborted).toBe(true);
  expect(jest.getTimerCount()).toBe(0);
});

it.each([
  [{ GEMINI_API_KEY: 'new-key', OPENROUTER_API_KEY: 'legacy-key' }, 'new-key'],
  [{ GOOGLE_API_KEY: 'google-key' }, 'google-key'],
  [{ OPENROUTER_API_KEY: 'legacy-key' }, 'legacy-key'],
])('loads the configured key into Expo while preserving existing extras (%s)', (env, key) => {
  jest.replaceProperty(process, 'env', { NODE_ENV: 'test', ...env });
  const appConfig = require('../../../app.config.js');
  const config = appConfig({ config: { extra: { eas: { projectId: 'existing-project' } } } });
  expect(config.extra.geminiApiKey).toBe(key);
  expect(config.extra.eas.projectId).toBe('existing-project');
});
