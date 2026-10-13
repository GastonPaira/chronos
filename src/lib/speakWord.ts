// Lee una palabra o frase corta en voz alta con la voz del navegador (si el dispositivo tiene).

export function speakWord(text: string, lang: 'en-US' | 'es-ES' = 'en-US'): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  window.speechSynthesis.speak(utterance);
}
