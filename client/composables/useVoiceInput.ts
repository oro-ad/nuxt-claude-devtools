import { ref } from 'vue'

export function useVoiceInput() {
  const isRecording = ref(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const speechRecognition = ref<any>(null)
  const isSpeechSupported = ref(false)

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
    recognition.interimResults = true
    recognition.lang = 'ru-RU' // Default to Russian, will auto-detect

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        }
      }

      if (finalTranscript) {
        onResult(finalTranscript)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      isRecording.value = false
    }

    recognition.onend = () => {
      isRecording.value = false
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
      speechRecognition.value.stop()
      isRecording.value = false
    }
    else {
      speechRecognition.value.start()
      isRecording.value = true
    }
  }

  function stopRecording() {
    if (isRecording.value && speechRecognition.value) {
      speechRecognition.value.stop()
      isRecording.value = false
    }
  }

  function cleanup() {
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
