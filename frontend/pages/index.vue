<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-50 to-white">
    <!-- Hero Section -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
      <div class="text-center">
        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
          Track Your Exercises with
          <span class="text-primary-600">AI Precision</span>
        </h1>
        <p class="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto mb-10">
          Real-time pose detection and form analysis powered by camera-based AI. 
          Get instant feedback, count reps automatically, and track your progress over time.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <NuxtLink to="/register" class="btn-primary text-lg px-8 py-3">
            Get Started Free
          </NuxtLink>
          <NuxtLink to="/login" class="btn-outline text-lg px-8 py-3">
            Sign In
          </NuxtLink>
        </div>
      </div>

      <!-- Demo Animation -->
      <div class="mt-16 relative">
        <div class="aspect-video max-w-4xl mx-auto bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
          <canvas 
            ref="demoCanvas" 
            class="w-full h-full"
            width="800"
            height="450"
          />
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="text-center text-white">
              <div class="text-6xl font-bold mb-2">3</div>
              <div class="text-sm uppercase tracking-wider">Reps Counted</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Features Section -->
    <div class="py-20 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="text-3xl font-bold text-center mb-16">
          Everything You Need for Better Workouts
        </h2>
        
        <div class="grid md:grid-cols-3 gap-8">
          <!-- Feature 1 -->
          <div class="card p-8 text-center">
            <div class="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h3 class="text-xl font-semibold mb-3">Real-Time Detection</h3>
            <p class="text-gray-600">
              Browser-based pose estimation tracks your body in real-time. 
              No special equipment needed - just your camera.
            </p>
          </div>

          <!-- Feature 2 -->
          <div class="card p-8 text-center">
            <div class="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="text-xl font-semibold mb-3">Form Analysis</h3>
            <p class="text-gray-600">
              Get instant feedback on your exercise form. Track depth, 
              knee alignment, trunk position, and symmetry.
            </p>
          </div>

          <!-- Feature 3 -->
          <div class="card p-8 text-center">
            <div class="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg class="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 class="text-xl font-semibold mb-3">Progress Tracking</h3>
            <p class="text-gray-600">
              See how you're improving over time with detailed analytics 
              and progress charts for each exercise.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- How It Works -->
    <div class="py-20 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="text-3xl font-bold text-center mb-16">How It Works</h2>
        
        <div class="grid md:grid-cols-4 gap-8">
          <div class="text-center">
            <div class="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              1
            </div>
            <h3 class="font-semibold mb-2">Choose Exercise</h3>
            <p class="text-sm text-gray-600">Select from our exercise library or create custom exercises</p>
          </div>
          
          <div class="text-center">
            <div class="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              2
            </div>
            <h3 class="font-semibold mb-2">Position Camera</h3>
            <p class="text-sm text-gray-600">Set up your camera so your full body is visible</p>
          </div>
          
          <div class="text-center">
            <div class="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              3
            </div>
            <h3 class="font-semibold mb-2">Start Exercising</h3>
            <p class="text-sm text-gray-600">AI tracks your movements and counts reps automatically</p>
          </div>
          
          <div class="text-center">
            <div class="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              4
            </div>
            <h3 class="font-semibold mb-2">Review Results</h3>
            <p class="text-sm text-gray-600">Get detailed feedback on form and track your progress</p>
          </div>
        </div>
      </div>
    </div>

    <!-- CTA Section -->
    <div class="py-20 bg-primary-600">
      <div class="max-w-4xl mx-auto text-center px-4">
        <h2 class="text-3xl font-bold text-white mb-6">
          Ready to Improve Your Form?
        </h2>
        <p class="text-primary-100 text-lg mb-8">
          Join thousands of users who are exercising smarter with PhysioTracker.
          Free to start, no credit card required.
        </p>
        <NuxtLink to="/register" class="inline-block bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors">
          Start Free Trial
        </NuxtLink>
      </div>
    </div>

    <!-- Footer -->
    <footer class="bg-gray-900 text-gray-400 py-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col md:flex-row justify-between items-center">
          <div class="flex items-center gap-2 mb-4 md:mb-0">
            <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold">PT</span>
            </div>
            <span class="font-bold text-white">PhysioTracker</span>
          </div>
          <div class="text-sm">
            © {{ new Date().getFullYear() }} PhysioTracker. Privacy-first exercise tracking.
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { SkeletonRenderer } from '~/utils/pose/skeleton-renderer';

const demoCanvas = ref<HTMLCanvasElement | null>(null);
let renderer: SkeletonRenderer | null = null;
let animationFrame: number | null = null;
let startTime = 0;

onMounted(() => {
  if (demoCanvas.value) {
    renderer = new SkeletonRenderer(demoCanvas.value);
    startTime = performance.now();
    animate();
  }
});

function animate() {
  if (!renderer) return;
  
  const elapsed = (performance.now() - startTime) / 1000;
  const progress = (elapsed % 2) / 2; // 2-second cycle
  
  renderer.drawDemoSkeleton(progress);
  
  animationFrame = requestAnimationFrame(animate);
}

onUnmounted(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }
});

// Redirect authenticated users to dashboard
const auth = useAuthStore();
if (auth.isAuthenticated) {
  navigateTo('/dashboard');
}
</script>
