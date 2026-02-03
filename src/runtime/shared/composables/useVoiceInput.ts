import { ref } from 'vue'

export function useVoiceInput() {
  const isRecording = ref(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const speechRecognition = ref<any>(null)
  const isSpeechSupported = ref(false)
  // Track if user explicitly stopped (vs auto-stop on mobile)
  const userStopped = ref(false)

  // Check support immediately (client-side only)
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    isSpeechSupported.value = !!SpeechRecognitionAPI
  }

  function initSpeechRecognition(onResult: (transcript: string) => void) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      isSpeechSupported.value = false
      return
    }

    isSpeechSupported.value = true
    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = false // Only final results to avoid duplicates
    recognition.lang = navigator.language || 'en-US'

    // Track which result indices we've already sent to callback
    // This is needed because the results array is cumulative in continuous mode
    let processedResultCount = 0

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      // event.resultIndex = lowest index that changed
      // In continuous mode, results accumulate. We only want to send NEW final results.
      // See: https://developer.chrome.com/blog/voice-driven-web-apps-introduction-to-the-web-speech-api
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        // Only process if it's final AND we haven't processed this index before
        if (result.isFinal && i >= processedResultCount) {
          const transcript = result[0].transcript
          if (transcript.trim()) {
            onResult(transcript)
          }
          processedResultCount = i + 1
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      // Ignore 'no-speech' and 'aborted' errors (common on mobile)
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return
      }
      console.error('Speech recognition error:', event.error)
      isRecording.value = false
    }

    recognition.onend = () => {
      // Auto-restart if user hasn't explicitly stopped (mobile fix)
      if (isRecording.value && !userStopped.value) {
        // Small delay before restart (mobile needs this)
        setTimeout(() => {
          if (isRecording.value && !userStopped.value && speechRecognition.value) {
            // Reset counter for new session (results array resets on restart)
            processedResultCount = 0
            try {
              speechRecognition.value.start()
            }
            catch {
              isRecording.value = false
            }
          }
        }, 100)
      }
      else {
        isRecording.value = false
      }
    }

    recognition.onstart = () => {
      // Reset counter when starting fresh
      processedResultCount = 0
    }

    speechRecognition.value = recognition
  }

  function toggleVoiceInput(onResult: (transcript: string) => void) {
    if (!speechRecognition.value) {
      initSpeechRecognition(onResult)
    }

    if (!speechRecognition.value) {
      alert('Speech recognition is not supported in this browser. Try Chrome or Edge.')
      return
    }

    if (isRecording.value) {
      // User explicitly stopping
      userStopped.value = true
      speechRecognition.value.stop()
      isRecording.value = false
    }
    else {
      // User starting
      userStopped.value = false
      try {
        speechRecognition.value.start()
        isRecording.value = true
      }
      catch (e) {
        // Already started or other error
        console.error('Failed to start speech recognition:', e)
      }
    }
  }

  function stopRecording() {
    userStopped.value = true
    if (isRecording.value && speechRecognition.value) {
      speechRecognition.value.stop()
      isRecording.value = false
    }
  }

  function cleanup() {
    userStopped.value = true
    if (speechRecognition.value && isRecording.value) {
      speechRecognition.value.stop()
    }
  }

  return {
    isRecording,
    isSpeechSupported,
    initSpeechRecognition,
    toggleVoiceInput,
    stopRecording,
    cleanup,
  }
}
