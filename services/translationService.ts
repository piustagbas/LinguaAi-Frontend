export const LANGUAGE_CODES: Record<string, string> = {
  'English': 'en',
  'Spanish': 'es',
  'French': 'fr',
  'German': 'de',
  'Italian': 'it',
  'Portuguese': 'pt',
  'Chinese': 'zh-CN',
  'Japanese': 'ja',
  'Korean': 'ko',
  'Arabic': 'ar',
  'Hindi': 'hi',
  'Russian': 'ru',
  'Dutch': 'nl',
  'Swedish': 'sv',
  'Norwegian': 'no',
  'Danish': 'da',
  'Finnish': 'fi',
  'Polish': 'pl',
  'Czech': 'cs',
  'Turkish': 'tr',
  'Greek': 'el',
  'Hebrew': 'he',
  'Thai': 'th',
  'Vietnamese': 'vi',
  'Indonesian': 'id',
  'Malay': 'ms',
};

const FALLBACK_TRANSLATIONS: Record<string, Record<string, string>> = {
  'en-es': {
    'Hello': 'Hola',
    'How are you?': '¿Cómo estás?',
    'I am fine, thank you': 'Estoy bien, gracias',
    'Good morning': 'Buenos días',
    'Good night': 'Buenas noches',
    'Thank you': 'Gracias',
    'Yes': 'Sí',
    'No': 'No',
    'Please': 'Por favor',
    'Sorry': 'Lo siento',
  },
};

function getFallbackTranslation(text: string, fromCode: string, toCode: string): string | null {
  const key = `${fromCode}-${toCode}`;
  const dict = FALLBACK_TRANSLATIONS[key];
  if (!dict) return null;
  for (const [source, target] of Object.entries(dict)) {
    if (text.toLowerCase().includes(source.toLowerCase())) {
      return text.replace(new RegExp(source, 'gi'), target);
    }
  }
  return null;
}

function getCode(language: string): string {
  return LANGUAGE_CODES[language] || 'en';
}

function stripChinese(text: string): string {
  return text.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g, '').trim();
}

export async function translateText(
  text: string,
  fromLanguage: string,
  toLanguage: string,
): Promise<string> {
  if (!text.trim()) return '';
  if (fromLanguage === toLanguage) return text;

  const fromCode = getCode(fromLanguage);
  const toCode = getCode(toLanguage);

  try {
    const encoded = encodeURIComponent(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromCode}&tl=${toCode}&dt=t&q=${encoded}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data[0]) {
      const translated = data[0].map((segment: any) => segment[0]).join('');
      return translated;
    }
    throw new Error('Unexpected response format');
  } catch (e) {
    const fallback = getFallbackTranslation(text, fromCode, toCode);
    if (fallback) return fallback;
    return `[${toLanguage}] ${text}`;
  }
}

export async function translateTextSimple(
  text: string,
  toLanguage: string,
): Promise<string> {
  return translateText(text, 'English', toLanguage);
}
