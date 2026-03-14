import { PrismaClient, Role, ExerciseType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@physiotracker.com' },
    update: {},
    create: {
      email: 'admin@physiotracker.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: Role.ADMIN,
    },
  });
  console.log('✅ Created admin user:', admin.email);

  // Create demo physio
  const physioPassword = await bcrypt.hash('physio123', 12);
  const physio = await prisma.user.upsert({
    where: { email: 'physio@demo.com' },
    update: {},
    create: {
      email: 'physio@demo.com',
      passwordHash: physioPassword,
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: Role.PHYSIO,
    },
  });
  console.log('✅ Created demo physio:', physio.email);

  // Create demo patient
  const patientPassword = await bcrypt.hash('patient123', 12);
  const patient = await prisma.user.upsert({
    where: { email: 'patient@demo.com' },
    update: {},
    create: {
      email: 'patient@demo.com',
      passwordHash: patientPassword,
      firstName: 'John',
      lastName: 'Smith',
      role: Role.PATIENT,
      calibrationData: {
        standingKneeAngle: 165,
        mobilityLimit: 95,
        asymmetryBaseline: 3,
        lastCalibrated: new Date().toISOString(),
      },
    },
  });
  console.log('✅ Created demo patient:', patient.email);

  // Link physio and patient
  await prisma.physioPatient.upsert({
    where: {
      physioId_patientId: {
        physioId: physio.id,
        patientId: patient.id,
      },
    },
    update: {},
    create: {
      physioId: physio.id,
      patientId: patient.id,
      notes: 'Post knee surgery rehabilitation',
    },
  });
  console.log('✅ Linked physio and patient');

  // Create built-in exercises
  const exercises = [
    {
      name: 'Bodyweight Squat',
      description: 'A fundamental lower body exercise targeting quads, glutes, and core.',
      type: ExerciseType.REPETITION,
      muscleGroups: ['quadriceps', 'glutes', 'hamstrings', 'core'],
      difficulty: 2,
      isBuiltIn: true,
      isPublic: true,
      checkpoints: [
        { name: 'standing', conditions: { kneeAngle: '>160', hipAngle: '>160' } },
        { name: 'descending', conditions: { kneeAngle: '<160', kneeAngle_prev: '>' } },
        { name: 'bottom', conditions: { kneeAngle: '<100' } },
        { name: 'ascending', conditions: { kneeAngle: '>100', kneeAngle_prev: '<' } },
      ],
      formChecks: [
        { name: 'depth', rule: 'kneeAngle < 90', weight: 0.3, feedback: 'Try to go deeper - thighs parallel to ground' },
        { name: 'kneeTracking', rule: 'kneeValgus < 15', weight: 0.25, feedback: 'Push your knees out over your toes' },
        { name: 'trunkLean', rule: 'trunkAngle < 45', weight: 0.25, feedback: 'Keep your chest up' },
        { name: 'symmetry', rule: 'asymmetry < 10', weight: 0.2, feedback: 'Keep weight evenly distributed' },
      ],
      defaultConfig: {
        KNEE_STANDING_ANGLE: 160,
        KNEE_BOTTOM_ANGLE: 100,
        TRUNK_LEAN_MAX: 45,
        KNEE_VALGUS_THRESHOLD: 15,
        HOLD_THRESHOLD_MS: 500,
      },
      instructions: [
        'Stand with feet shoulder-width apart',
        'Keep your chest up and core engaged',
        'Push your hips back and bend your knees',
        'Lower until thighs are parallel to ground',
        'Push through your heels to stand back up',
      ],
      cues: ['Chest up', 'Knees out', 'Weight in heels', 'Core tight'],
      demoAnimation: {
        frameCount: 60,
        fps: 30,
        keyframes: [
          { t: 0, pose: 'standing' },
          { t: 30, pose: 'bottom' },
          { t: 60, pose: 'standing' },
        ],
      },
    },
    {
      name: 'Wall Sit',
      description: 'An isometric exercise that builds quad strength and endurance.',
      type: ExerciseType.HOLD,
      muscleGroups: ['quadriceps', 'glutes', 'core'],
      difficulty: 2,
      isBuiltIn: true,
      isPublic: true,
      checkpoints: [
        { name: 'standing', conditions: { kneeAngle: '>160' } },
        { name: 'holding', conditions: { kneeAngleMax: '<100', kneeAngleMin: '>80' } },
      ],
      formChecks: [
        { name: 'kneeAngle', rule: 'kneeAngle >= 85 && kneeAngle <= 95', weight: 0.4, feedback: 'Aim for 90 degree knee angle' },
        { name: 'backFlat', rule: 'trunkAngle < 10', weight: 0.3, feedback: 'Keep your back flat against the wall' },
        { name: 'symmetry', rule: 'asymmetry < 8', weight: 0.3, feedback: 'Keep weight evenly distributed' },
      ],
      defaultConfig: {
        TARGET_KNEE_ANGLE: 90,
        KNEE_TOLERANCE: 10,
        HOLD_THRESHOLD_MS: 1000,
      },
      instructions: [
        'Stand with your back against a wall',
        'Slide down until thighs are parallel to ground',
        'Keep your back flat against the wall',
        'Hold the position for the target duration',
        'Push through your heels to stand back up',
      ],
      cues: ['Back flat', 'Knees over ankles', 'Breathe steadily'],
    },
    {
      name: 'Single Leg Stand',
      description: 'Balance exercise for ankle stability and proprioception.',
      type: ExerciseType.HOLD,
      muscleGroups: ['ankle', 'core', 'hip'],
      difficulty: 1,
      isBuiltIn: true,
      isPublic: true,
      checkpoints: [
        { name: 'standing', conditions: { bothFeetDown: true } },
        { name: 'balancing', conditions: { oneFoot: true } },
      ],
      formChecks: [
        { name: 'hipLevel', rule: 'hipTilt < 10', weight: 0.4, feedback: 'Keep hips level' },
        { name: 'stability', rule: 'sway < 5', weight: 0.4, feedback: 'Minimize body sway' },
        { name: 'kneeAlignment', rule: 'kneeValgus < 10', weight: 0.2, feedback: 'Keep standing knee aligned' },
      ],
      defaultConfig: {
        HIP_TILT_MAX: 10,
        SWAY_THRESHOLD: 5,
        HOLD_THRESHOLD_MS: 1000,
      },
      instructions: [
        'Stand on one leg',
        'Keep your hips level',
        'Fix your gaze on a point ahead',
        'Hold for the target duration',
        'Switch legs and repeat',
      ],
      cues: ['Hips level', 'Core engaged', 'Eyes forward'],
    },
    {
      name: 'Lunge',
      description: 'A unilateral lower body exercise for strength and balance.',
      type: ExerciseType.REPETITION,
      muscleGroups: ['quadriceps', 'glutes', 'hamstrings', 'hip flexors'],
      difficulty: 3,
      isBuiltIn: true,
      isPublic: true,
      checkpoints: [
        { name: 'standing', conditions: { kneeAngle: '>160' } },
        { name: 'descending', conditions: { frontKneeAngle: '<160' } },
        { name: 'bottom', conditions: { frontKneeAngle: '<100', rearKneeAngle: '<100' } },
        { name: 'ascending', conditions: { frontKneeAngle: '>100' } },
      ],
      formChecks: [
        { name: 'frontKneeTracking', rule: 'frontKneeOverAnkle', weight: 0.3, feedback: 'Front knee should stay over ankle' },
        { name: 'torsoUpright', rule: 'trunkAngle < 20', weight: 0.3, feedback: 'Keep torso upright' },
        { name: 'depth', rule: 'rearKneeAngle < 100', weight: 0.2, feedback: 'Lower until rear knee nearly touches ground' },
        { name: 'balance', rule: 'stability > 80', weight: 0.2, feedback: 'Maintain balance throughout' },
      ],
      defaultConfig: {
        FRONT_KNEE_ANGLE_BOTTOM: 90,
        REAR_KNEE_ANGLE_BOTTOM: 90,
        TRUNK_LEAN_MAX: 20,
      },
      instructions: [
        'Stand with feet hip-width apart',
        'Step forward with one leg',
        'Lower your body until both knees are at 90 degrees',
        'Push through front heel to return to start',
        'Alternate legs or complete all reps on one side',
      ],
      cues: ['Knee over ankle', 'Chest up', 'Control the descent'],
    },
    {
      name: 'Calf Raise',
      description: 'Isolation exercise for calf muscles and ankle strength.',
      type: ExerciseType.REPETITION,
      muscleGroups: ['gastrocnemius', 'soleus', 'ankle'],
      difficulty: 1,
      isBuiltIn: true,
      isPublic: true,
      checkpoints: [
        { name: 'bottom', conditions: { ankleAngle: '>80' } },
        { name: 'top', conditions: { ankleAngle: '<70' } },
      ],
      formChecks: [
        { name: 'fullROM', rule: 'ankleAngle < 65', weight: 0.4, feedback: 'Rise up onto toes fully' },
        { name: 'controlledDescent', rule: 'descentSpeed < 2', weight: 0.3, feedback: 'Lower slowly with control' },
        { name: 'symmetry', rule: 'asymmetry < 15', weight: 0.3, feedback: 'Rise evenly on both feet' },
      ],
      defaultConfig: {
        ANKLE_TOP_ANGLE: 65,
        ANKLE_BOTTOM_ANGLE: 85,
      },
      instructions: [
        'Stand with feet hip-width apart',
        'Rise up onto your toes as high as possible',
        'Hold briefly at the top',
        'Lower slowly with control',
        'Repeat for target reps',
      ],
      cues: ['Full extension', 'Slow descent', 'Even pressure'],
    },
  ];

  for (const exercise of exercises) {
    await prisma.exercise.upsert({
      where: { 
        id: exercise.name.toLowerCase().replace(/\s+/g, '-') + '-builtin'
      },
      update: exercise,
      create: {
        id: exercise.name.toLowerCase().replace(/\s+/g, '-') + '-builtin',
        ...exercise,
      },
    });
    console.log(`✅ Created exercise: ${exercise.name}`);
  }

  // Create a demo routine
  const routine = await prisma.routine.upsert({
    where: { id: 'lower-body-basics' },
    update: {},
    create: {
      id: 'lower-body-basics',
      name: 'Lower Body Basics',
      description: 'A fundamental routine for lower body strength and mobility.',
      duration: 20,
      isPublic: true,
      createdById: physio.id,
      exercises: {
        create: [
          {
            exerciseId: 'bodyweight-squat-builtin',
            order: 0,
            sets: 3,
            reps: 10,
            restSeconds: 60,
          },
          {
            exerciseId: 'lunge-builtin',
            order: 1,
            sets: 3,
            reps: 8,
            restSeconds: 60,
            notes: '8 reps per leg',
          },
          {
            exerciseId: 'wall-sit-builtin',
            order: 2,
            sets: 3,
            holdSeconds: 30,
            restSeconds: 45,
          },
          {
            exerciseId: 'calf-raise-builtin',
            order: 3,
            sets: 3,
            reps: 15,
            restSeconds: 30,
          },
        ],
      },
    },
  });
  console.log('✅ Created routine:', routine.name);

  // Assign routine to patient
  await prisma.routineAssignment.upsert({
    where: { id: 'demo-assignment' },
    update: {},
    create: {
      id: 'demo-assignment',
      routineId: routine.id,
      patientId: patient.id,
      assignedById: physio.id,
      frequency: '3x/week',
      notes: 'Start with light intensity, increase as tolerated',
    },
  });
  console.log('✅ Assigned routine to patient');

  console.log('\n🎉 Seeding complete!');
  console.log('\nDemo accounts:');
  console.log('  Physio: physio@demo.com / physio123');
  console.log('  Patient: patient@demo.com / patient123');
  console.log('  Admin: admin@physiotracker.com / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
