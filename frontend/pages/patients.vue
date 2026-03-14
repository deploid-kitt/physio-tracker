<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">My Patients</h1>
        <p class="text-gray-600 mt-1">Manage and monitor your patients' progress</p>
      </div>
      <button @click="showAddModal = true" class="btn-primary">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Add Patient
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <div class="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Empty State -->
    <div v-else-if="patients.length === 0" class="card p-12 text-center">
      <div class="text-6xl mb-4">👥</div>
      <h3 class="text-xl font-semibold mb-2">No patients yet</h3>
      <p class="text-gray-600 mb-6">Add your first patient to start tracking their progress.</p>
      <button @click="showAddModal = true" class="btn-primary">
        Add Your First Patient
      </button>
    </div>

    <!-- Patients Grid -->
    <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="patient in patients" 
        :key="patient.id"
        class="card-hover p-6"
      >
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-semibold text-lg">
            {{ getInitials(patient) }}
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-lg truncate">
              {{ patient.firstName }} {{ patient.lastName }}
            </h3>
            <p class="text-sm text-gray-500 truncate">{{ patient.email }}</p>
          </div>
        </div>

        <div class="mt-4 pt-4 border-t border-gray-100">
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-500">Assigned</span>
            <span>{{ formatDate(patient.assignedAt) }}</span>
          </div>
          <p v-if="patient.notes" class="mt-2 text-sm text-gray-600 line-clamp-2">
            {{ patient.notes }}
          </p>
        </div>

        <div class="mt-4 flex gap-2">
          <NuxtLink 
            :to="`/patients/${patient.id}`" 
            class="btn-secondary flex-1 text-center text-sm"
          >
            View Progress
          </NuxtLink>
          <button 
            @click="confirmRemove(patient)"
            class="btn-danger text-sm px-3"
            title="Remove patient"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Add Patient Modal -->
    <Teleport to="body">
      <div 
        v-if="showAddModal"
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        @click.self="showAddModal = false"
      >
        <div class="bg-white rounded-xl max-w-md w-full p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-semibold">Add Patient</h3>
            <button @click="showAddModal = false" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="addPatient">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Patient Email
                </label>
                <input 
                  v-model="newPatient.email"
                  type="email"
                  required
                  class="input"
                  placeholder="patient@example.com"
                />
                <p class="text-sm text-gray-500 mt-1">
                  The patient must already have an account
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea 
                  v-model="newPatient.notes"
                  class="input"
                  rows="3"
                  placeholder="Add notes about this patient..."
                />
              </div>
            </div>

            <div v-if="addError" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {{ addError }}
            </div>

            <div class="mt-6 flex gap-3">
              <button type="button" @click="showAddModal = false" class="btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" :disabled="isAdding" class="btn-primary flex-1">
                <span v-if="isAdding">Adding...</span>
                <span v-else>Add Patient</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Remove Confirmation Modal -->
    <Teleport to="body">
      <div 
        v-if="patientToRemove"
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        @click.self="patientToRemove = null"
      >
        <div class="bg-white rounded-xl max-w-md w-full p-6">
          <div class="text-center">
            <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 class="text-xl font-semibold mb-2">Remove Patient</h3>
            <p class="text-gray-600">
              Are you sure you want to remove 
              <strong>{{ patientToRemove.firstName }} {{ patientToRemove.lastName }}</strong>
              from your patients list?
            </p>
            <p class="text-sm text-gray-500 mt-2">
              This won't delete their account or exercise history.
            </p>
          </div>

          <div class="mt-6 flex gap-3">
            <button @click="patientToRemove = null" class="btn-secondary flex-1">
              Cancel
            </button>
            <button @click="removePatient" :disabled="isRemoving" class="btn-danger flex-1">
              <span v-if="isRemoving">Removing...</span>
              <span v-else>Remove</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useApi } from '~/composables/useApi';

interface Patient {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  notes?: string;
  assignedAt: string;
  createdAt: string;
}

const auth = useAuthStore();
const api = useApi();

const patients = ref<Patient[]>([]);
const isLoading = ref(true);
const showAddModal = ref(false);
const patientToRemove = ref<Patient | null>(null);
const isAdding = ref(false);
const isRemoving = ref(false);
const addError = ref('');

const newPatient = ref({
  email: '',
  notes: '',
});

function getInitials(patient: Patient): string {
  return `${patient.firstName?.[0] || ''}${patient.lastName?.[0] || ''}`.toUpperCase() || '?';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

async function fetchPatients() {
  isLoading.value = true;
  try {
    const response = await api.get<Patient[]>('/users/patients');
    if (response.success && response.data) {
      patients.value = response.data;
    }
  } catch (error) {
    console.error('Failed to fetch patients:', error);
  } finally {
    isLoading.value = false;
  }
}

async function addPatient() {
  if (!newPatient.value.email) return;

  isAdding.value = true;
  addError.value = '';

  try {
    const response = await api.post<Patient>('/users/patients', {
      email: newPatient.value.email,
      notes: newPatient.value.notes || undefined,
    });

    if (response.success && response.data) {
      // Add to list with current date as assignedAt
      patients.value.unshift({
        ...response.data,
        notes: newPatient.value.notes,
        assignedAt: new Date().toISOString(),
      });
      showAddModal.value = false;
      newPatient.value = { email: '', notes: '' };
    } else {
      addError.value = response.error || 'Failed to add patient';
    }
  } catch (error: any) {
    addError.value = error.data?.error || error.message || 'Failed to add patient';
  } finally {
    isAdding.value = false;
  }
}

function confirmRemove(patient: Patient) {
  patientToRemove.value = patient;
}

async function removePatient() {
  if (!patientToRemove.value) return;

  isRemoving.value = true;

  try {
    await api.delete(`/users/patients/${patientToRemove.value.id}`);
    patients.value = patients.value.filter(p => p.id !== patientToRemove.value!.id);
    patientToRemove.value = null;
  } catch (error) {
    console.error('Failed to remove patient:', error);
  } finally {
    isRemoving.value = false;
  }
}

onMounted(() => {
  fetchPatients();
});

// Auth guard - only for physios and admins
definePageMeta({
  middleware: ['auth'],
});
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
