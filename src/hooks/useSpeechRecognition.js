import { useCallback, useEffect, useRef, useState } from 'react';

// Wrapper around the (still-prefixed-on-Safari) Web Speech API that
// mirrors a finite-state machine so callers can render reliable UI.
//
// Status flow:
//   idle -> listening -> evaluating -> done | error
//
// The hook is single-flight: starting a new session for a different phrase
// auto-aborts any previous session.

const STATUS = {
  idle: 'idle',
  listening: 'listening',
  evaluating: 'evaluating',
  done: 'done',
  error: 'error',
};

function getRecognition() {
  if (typeof window === 'undefined') return null;
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export default function useSpeechRecognition({ lang = 'ko-KR' } = {}) {
  const [status, setStatus] = useState(STATUS.idle);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const recognitionRef = useRef(null);
  const stopReasonRef = useRef('user');

  const reset = useCallback(() => {
    setStatus(STATUS.idle);
    setTranscript('');
    setInterim('');
    setError(null);
  }, []);

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    stopReasonRef.current = 'user';
    try {
      rec.stop();
    } catch { /* ignore */ }
  }, []);

  const start = useCallback(
    (id) => {
      const rec = getRecognition();
      if (!rec) {
        setError('unsupported');
        setStatus(STATUS.error);
        return false;
      }

      if (recognitionRef.current) {
        stopReasonRef.current = 'switch';
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
      }

      rec.lang = lang;
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 1;

      let finalTranscript = '';
      setActiveId(id);
      setTranscript('');
      setInterim('');
      setError(null);
      setStatus(STATUS.listening);

      rec.onresult = (event) => {
        let interimChunk = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimChunk += result[0].transcript;
          }
        }
        setInterim(interimChunk);
        if (finalTranscript) setTranscript(finalTranscript);
      };

      rec.onerror = (event) => {
        setError(event.error || 'recognition_error');
        setStatus(STATUS.error);
      };

      rec.onend = () => {
        recognitionRef.current = null;
        if (stopReasonRef.current === 'switch') return;
        setStatus((prev) => {
          if (prev === STATUS.error) return prev;
          return STATUS.done;
        });
        setInterim('');
      };

      recognitionRef.current = rec;
      try {
        rec.start();
        return true;
      } catch (err) {
        setError(err?.message || 'start_failed');
        setStatus(STATUS.error);
        return false;
      }
    },
    [lang]
  );

  useEffect(() => () => {
    const rec = recognitionRef.current;
    if (rec) {
      stopReasonRef.current = 'unmount';
      try { rec.stop(); } catch { /* ignore */ }
    }
  }, []);

  return {
    status,
    transcript,
    interim,
    error,
    activeId,
    isListening: status === STATUS.listening,
    isSupported: Boolean(getRecognition()),
    start,
    stop,
    reset,
  };
}

export const SR_STATUS = STATUS;
