import {
  startListening,
  stopListening,
  SpeechRecognitionResult,
} from './speechService';
import { translateText } from './translationService';
import { speakTranslation, stopSpeaking, queueTranslation } from './ttsService';

export type TranscriptionEntry = {
  role: 'me' | 'them';
  original: string;
  translated: string;
};

export type CallAudioHandler = {
  onUserSpeechStart: () => void;
  onUserSpeechEnd: () => void;
  onTranscriptionComplete: (entry: TranscriptionEntry) => void;
  onTranslationStart: () => void;
  onTranslationEnd: () => void;
  onError: (error: string) => void;
};

let isProcessing = false;
let accumulatedText = '';
let userLanguage = 'English';
let receiverLanguage = 'Spanish';
let selectedVoice = 'Default';
let voiceEnabled = true;

export function configureCallAudio(
  userLang: string,
  receiverLang: string,
  voice: string,
  voiceOn: boolean = true,
): void {
  userLanguage = userLang;
  receiverLanguage = receiverLang;
  selectedVoice = voice;
  voiceEnabled = voiceOn;
}

export async function startUserSpeechRecognition(
  handler: CallAudioHandler,
): Promise<void> {
  accumulatedText = '';

  await startListening(userLanguage, {
    onSpeechStart: () => {
      if (!isProcessing) {
        handler.onUserSpeechStart();
      }
    },
    onSpeechEnd: () => {
      handler.onUserSpeechEnd();
    },
    onResult: async (result: SpeechRecognitionResult) => {
      if (result.isFinal && result.transcript.trim()) {
        accumulatedText = result.transcript.trim();
        await processUserSpeech(accumulatedText, handler);
      }
    },
    onError: (error: string) => {
      handler.onError(error);
    },
  });
}

async function processUserSpeech(
  text: string,
  handler: CallAudioHandler,
): Promise<void> {
  if (isProcessing || !text.trim()) return;
  isProcessing = true;

  handler.onTranslationStart();
  try {
    const translated = await translateText(text, userLanguage, receiverLanguage);

    if (voiceEnabled) {
      queueTranslation(translated, receiverLanguage, selectedVoice);
    }

    handler.onTranscriptionComplete({
      role: 'me',
      original: text,
      translated,
    });
  } catch (e) {
    handler.onError(`Translation failed: ${e}`);
  } finally {
    isProcessing = false;
    handler.onTranslationEnd();
  }
}

export async function processIncomingSpeech(
  originalText: string,
  sourceLanguage: string,
  handler: CallAudioHandler,
): Promise<void> {
  handler.onTranslationStart();
  try {
    const translated = await translateText(originalText, sourceLanguage, userLanguage);

    if (voiceEnabled) {
      speakTranslation(translated, userLanguage, selectedVoice);
    }

    handler.onTranscriptionComplete({
      role: 'them',
      original: originalText,
      translated,
    });
  } catch (e) {
    handler.onError(`Incoming translation failed: ${e}`);
  } finally {
    handler.onTranslationEnd();
  }
}

export function stopCallAudio(): void {
  stopListening();
  stopSpeaking();
  isProcessing = false;
  accumulatedText = '';
}

export { isListening } from './speechService';
