import { ref } from 'vue'
import type { Ref } from 'vue'
import { useSocket } from './useSocket'

/**
 * Base interface for CRUD resources
 * All resources must have at least these fields
 */
export interface BaseResource {
  name: string
  updatedAt: string
}

/**
 * Configuration for CRUD resource
 */
export interface CrudResourceConfig<T extends BaseResource, TForm> {
  /** Resource name for socket events (e.g., 'agents', 'skills', 'commands') */
  resourceName: string

  /** Logger name for debugging */
  loggerName?: string

  /** Create default form values */
  createDefaultForm: () => TForm

  /** Convert resource to form for editing */
  resourceToForm: (resource: T) => TForm

  /** Validate form before save, returns error message or null */
  validateForm?: (form: TForm) => string | null

  /** Transform form data before sending to server */
  transformFormForSave?: (form: TForm, isEditing: boolean) => Record<string, unknown>

  /** Additional socket events to handle on connect */
  onConnect?: (helpers: CrudHelpers) => void

  /** Additional socket listeners to setup */
  setupListeners?: (helpers: CrudHelpers) => void
}

export interface CrudHelpers {
  emit: <T = unknown>(event: string, data?: T) => void
  on: <T = unknown>(event: string, handler: (data: T) => void) => void
  log: (...args: unknown[]) => void
}

export interface UseCrudResourceReturn<T extends BaseResource, TForm> {
  // Socket state
  socket: Ref<unknown>
  isConnected: Ref<boolean>
  isLoading: Ref<boolean>

  // Resource state
  items: Ref<T[]>
  selectedItem: Ref<T | null>
  isEditing: Ref<boolean>
  showNewForm: Ref<boolean>
  formError: Ref<string>

  // Form state
  newForm: Ref<TForm>
  editForm: Ref<TForm>

  // Actions
  load: () => void
  select: (item: T) => void
  startEditing: () => void
  save: () => void
  cancelEditing: () => void
  deleteItem: (name: string, confirmMessage?: string) => void
  resetNewForm: () => void
  showNew: () => void

  // Helpers
  emit: <D = unknown>(event: string, data?: D) => void
  on: <D = unknown>(event: string, handler: (data: D) => void) => void
  log: (...args: unknown[]) => void
  formatDate: (dateStr: string) => string
}

/**
 * Generic CRUD resource composable
 * Handles common CRUD operations for resources like agents, skills, commands
 */
export function useCrudResource<T extends BaseResource, TForm>(
  config: CrudResourceConfig<T, TForm>,
): UseCrudResourceReturn<T, TForm> {
  const {
    resourceName,
    loggerName = resourceName,
    createDefaultForm,
    resourceToForm,
    validateForm,
    transformFormForSave,
    onConnect: onConnectCallback,
    setupListeners,
  } = config

  // Resource state
  const items = ref<T[]>([]) as Ref<T[]>
  const selectedItem = ref<T | null>(null) as Ref<T | null>
  const isEditing = ref(false)
  const showNewForm = ref(false)
  const isLoading = ref(false)
  const formError = ref('')

  // Form state
  const newForm = ref(createDefaultForm()) as Ref<TForm>
  const editForm = ref(createDefaultForm()) as Ref<TForm>

  // Socket events
  const listEvent = `${resourceName}:list`
  const savedEvent = `${resourceName}:saved`
  const deletedEvent = `${resourceName}:deleted`
  const saveEvent = `${resourceName}:save`
  const deleteEvent = `${resourceName}:delete`

  // Initialize socket
  const { socket, isConnected, emit, on, log } = useSocket({
    loggerName,
    onConnect: () => {
      load()
      onConnectCallback?.({ emit, on, log })
    },
    autoConnect: true,
  })

  // Setup CRUD listeners
  on<T[]>(listEvent, (data) => {
    log(`${resourceName} list received`, data.length)
    items.value = data
    isLoading.value = false
  })

  on<{ success: boolean, [key: string]: unknown }>(savedEvent, (data) => {
    const resourceKey = resourceName.slice(0, -1) // agents -> agent
    if (data.success && data[resourceKey]) {
      selectedItem.value = data[resourceKey] as T
      isEditing.value = false
      showNewForm.value = false
      resetNewForm()
      formError.value = ''
    }
    else {
      formError.value = (data.error as string) || `Failed to save ${resourceKey}`
    }
  })

  on<{ name: string, success: boolean }>(deletedEvent, (data) => {
    if (data.success && selectedItem.value?.name === data.name) {
      selectedItem.value = null
    }
  })

  // Setup additional listeners
  setupListeners?.({ emit, on, log })

  // Actions
  function load() {
    isLoading.value = true
    emit(listEvent)
  }

  function select(item: T) {
    selectedItem.value = item
    editForm.value = resourceToForm(item)
    isEditing.value = false
    showNewForm.value = false
  }

  function startEditing() {
    if (selectedItem.value) {
      editForm.value = resourceToForm(selectedItem.value)
      isEditing.value = true
    }
  }

  function save() {
    const form = isEditing.value ? editForm.value : newForm.value

    // Validate
    if (validateForm) {
      const error = validateForm(form)
      if (error) {
        formError.value = error
        return
      }
    }

    // Transform and send
    const data = transformFormForSave
      ? transformFormForSave(form, isEditing.value)
      : form

    emit(saveEvent, data)
  }

  function cancelEditing() {
    if (selectedItem.value) {
      editForm.value = resourceToForm(selectedItem.value)
    }
    isEditing.value = false
    formError.value = ''
  }

  function deleteItem(name: string, confirmMessage?: string) {
    const message = confirmMessage || `Delete "${name}"?`
    if (!confirm(message)) return

    emit(deleteEvent, name)
  }

  function resetNewForm() {
    newForm.value = createDefaultForm()
    formError.value = ''
  }

  function showNew() {
    showNewForm.value = true
    selectedItem.value = null
    resetNewForm()
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString()
  }

  return {
    // Socket state
    socket,
    isConnected,
    isLoading,

    // Resource state
    items,
    selectedItem,
    isEditing,
    showNewForm,
    formError,

    // Form state
    newForm,
    editForm,

    // Actions
    load,
    select,
    startEditing,
    save,
    cancelEditing,
    deleteItem,
    resetNewForm,
    showNew,

    // Helpers
    emit,
    on,
    log,
    formatDate,
  }
}
