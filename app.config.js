module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    openRouterApiKey: process.env.OPENROUTER_API_KEY ?? '',
  },
});
