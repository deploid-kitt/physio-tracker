<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">Settings</h1>

    <!-- Profile Section -->
    <div class="card mb-6">
      <div class="p-4 border-b">
        <h2 class="font-semibold">Profile</h2>
      </div>
      <form @submit.prevent="updateProfile" class="p-6 space-y-4">
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input v-model="profile.firstName" type="text" class="input" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input v-model="profile.lastName" type="text" class="input" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input :value="auth.user?.email" type="email" disabled class="input bg-gray-50" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <input :value="auth.user?.role" type="text" disabled class="input bg-gray-50 capitalize" />
        </div>
        <button type="submit" class="btn-primary" :disabled="isSaving">
          {{ isSaving ? 'Saving...' : 'Save Changes' }}
        </button>
      </form>
    </div>

    <!-- Calibration Section -->
    <div class="card mb-6">
      <div class="p-4 border-b">
        <h2 class="font-semibold">Calibration</h2>
        <p class="text-sm text-gray-500 mt-1">
          Adjust these settings to match your body measurements for more accurate tracking.
        </p>
      </div>
      <form @submit.prevent="updateCalibration" class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Standing Knee Angle (degrees)
          </label>
          <input 
            v-model.number="calibration.standingKneeAngle" 
            type="number" 
            min="150" 
            max="180"
            class="input"
          />
          <p class="text-xs text-gray-500 mt-1">
            Your natural knee angle when standing straight (typically 160-175°)
          </p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Mobility Limit (degrees)
          </label>
          <input 
            v-model.number="calibration.mobilityLimit" 
            type="number"
            min="60"
            max="120" 
            class="input"
          />
          <p class="text-xs text-gray-500 mt-1">
            Your comfortable maximum squat depth (lower = deeper)
          </p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Asymmetry Baseline (%)
          </label>
          <input 
            v-model.number="calibration.asymmetryBaseline" 
            type="number"
            min="0"
            max="20"
            class="input"
          />
          <p class="text-xs text-gray-500 mt-1">
            Your natural side-to-side difference (typically 0-10%)
          </p>
        </div>
        <button type="submit" class="btn-primary" :disabled="isSaving">
          {{ isSaving ? 'Saving...' : 'Save Calibration' }}
        </button>
      </form>
    </div>

    <!-- Change Password -->
    <div class="card mb-6">
      <div class="p-4 border-b">
        <h2 class="font-semibold">Change Password</h2>
      </div>
      <form @submit.prevent="changePassword" class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
          <input v-model="passwordForm.current" type="password" class="input" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <input v-model="passwordForm.new" type="password" minlength="8" class="input" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
          <input v-model="passwordForm.confirm" type="password" class="input" />
        </div>
        <button type="submit" class="btn-primary" :disabled="isSaving">
          Change Password
        </button>
      </form>
    </div>

    <!-- Danger Zone -->
    <div class="card border-red-200">
      <div class="p-4 border-b border-red-200 bg-red-50">
        <h2 class="font-semibold text-red-700">Danger Zone</h2>
      </div>
      <div class="p-6">
        <p class="text-gray-600 mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <button @click="confirmDelete" class="btn-danger">
          Delete Account
        </button>
      </div>
    </div>

    <!-- Toast notification -->
    <div 
      v-if="toast.show"
      :class="[
        'fixed bottom-20 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 transition-all',
        toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
      ]"
    >
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useApi } from '~/composables/useApi';

const auth = useAuthStore();
const api = useApi();

const isSaving = ref(false);
const toast = reactive({
  show: false,
  message: '',
  type: 'success' as 'success' | 'error',
});

const profile = reactive({
  firstName: '',
  lastName: '',
});

const calibration = reactive({
  standingKneeAngle: 165,
  mobilityLimit: 95,
  asymmetryBaseline: 5,
});

const passwordForm = reactive({
  current: '',
  new: '',
  confirm: '',
});

function showToast(message: string, type: 'success' | 'error' = 'success') {
  toast.message = message;
  toast.type = type;
  toast.show = true;
  setTimeout(() => { toast.show = false; }, 3000);
}

async function updateProfile() {
  isSaving.value = true;
  try {
    await auth.updateProfile({
      firstName: profile.firstName,
      lastName: profile.lastName,
    });
    showToast('Profile updated successfully');
  } catch (err: any) {
    showToast(err.message || 'Failed to update profile', 'error');
  } finally {
    isSaving.value = false;
  }
}

async function updateCalibration() {
  isSaving.value = true;
  try {
    await auth.updateCalibration(calibration);
    showToast('Calibration saved successfully');
  } catch (err: any) {
    showToast(err.message || 'Failed to save calibration', 'error');
  } finally {
    isSaving.value = false;
  }
}

async function changePassword() {
  if (passwordForm.new !== passwordForm.confirm) {
    showToast('Passwords do not match', 'error');
    return;
  }

  isSaving.value = true;
  try {
    await api.post('/users/me/change-password', {
      currentPassword: passwordForm.current,
      newPassword: passwordForm.new,
    });
    showToast('Password changed successfully');
    passwordForm.current = '';
    passwordForm.new = '';
    passwordForm.confirm = '';
  } catch (err: any) {
    showToast(err.data?.error || 'Failed to change password', 'error');
  } finally {
    isSaving.value = false;
  }
}

function confirmDelete() {
  if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
    // TODO: Implement account deletion
    showToast('Account deletion is not implemented yet', 'error');
  }
}

onMounted(() => {
  if (auth.user) {
    profile.firstName = auth.user.firstName;
    profile.lastName = auth.user.lastName;
    
    if (auth.user.calibrationData) {
      calibration.standingKneeAngle = auth.user.calibrationData.standingKneeAngle || 165;
      calibration.mobilityLimit = auth.user.calibrationData.mobilityLimit || 95;
      calibration.asymmetryBaseline = auth.user.calibrationData.asymmetryBaseline || 5;
    }
  }
});

// Auth guard
definePageMeta({
  middleware: ['auth'],
});
</script>
