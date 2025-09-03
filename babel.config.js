module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@components': './src/components',
            '@context': './src/context',
            '@navigation': './src/navigation',
            '@themes': './src/themes',
            '@services': './src/services',
            '@hooks': './src/hooks',
            '@data': './src/data'
          }
        }
      ],
      'react-native-reanimated/plugin'
    ]
  };
};
