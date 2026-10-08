module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    geminiApiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.OPENROUTER_API_KEY || '',
  },
});
