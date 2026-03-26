const isWeb = process.env.EXPO_OS === 'web' || process.env.WEB === 'true';

module.exports = {
  plugins: isWeb ? [require('tailwindcss')] : [],
};

