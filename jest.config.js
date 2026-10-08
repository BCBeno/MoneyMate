const expoCoreRoot = require('path').dirname(require.resolve('expo-modules-core/package.json', {
  paths: [require.resolve('expo/package.json')],
}));

module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^expo-modules-core$': expoCoreRoot,
    '^expo-modules-core/(.*)$': expoCoreRoot + '/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg))',
  ],
};
