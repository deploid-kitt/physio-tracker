# PhysioTracker - Camera-Based Exercise Analysis

A comprehensive physiotherapy web application for exercise tracking and analysis using browser-based pose detection.

## 🎯 Features

### Core Functionality
- **Real-time Pose Detection**: Uses MediaPipe Pose for accurate body landmark tracking
- **Rep Counting**: Automatic repetition counting with state machine logic
- **Form Analysis**: Real-time feedback on exercise form quality
- **Progress Tracking**: Historical data and trend visualization
- **Multi-role Support**: Physio and Patient roles with appropriate permissions

### Exercise Detection
- **State Machine**: standing → descending → bottom/hold → ascending → standing
- **Body-size Independent**: Uses normalized joint angles and ratios
- **Form Quality Checks**:
  - Squat depth (parallel vs below parallel)
  - Knee valgus (knees caving inward)
  - Trunk lean (excessive forward lean)
  - Heel lift detection
  - Asymmetry analysis

### Technical Highlights
- **Privacy-First**: Only keypoints/metrics stored, not raw video
- **ML-Ready**: Keypoint sequences stored in format suitable for future training
- **Explainable**: Rule-based classifier with clear thresholds
- **Responsive**: Works on desktop and mobile

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                          │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Camera Feed   │  │  MediaPipe Pose │  │ Exercise Engine │  │
│  │   (WebRTC)      │──│  (WASM/WebGL)   │──│  (State Machine)│  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│           │                    │                    │            │
│           ▼                    ▼                    ▼            │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Vue 3 / Nuxt 3 Frontend                        │ │
│  │  - Canvas overlay with skeleton                             │ │
│  │  - Real-time rep counter and form feedback                  │ │
│  │  - Exercise library and routine management                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼ REST API
┌──────────────────────────────────────────────────────────────────┐
│                    Express Backend                                │
├──────────────────────────────────────────────────────────────────┤
│  - JWT Authentication                                            │
│  - User/Role Management                                          │
│  - Exercise Library CRUD                                         │
│  - Session Storage (keypoints + metrics)                         │
│  - Progress Analytics                                            │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                           │
├──────────────────────────────────────────────────────────────────┤
│  - Users, Roles, Assignments                                     │
│  - Exercise Definitions                                          │
│  - Session Records (keypoint sequences, metrics)                 │
│  - Progress History                                              │
└──────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Development
```bash
# Start all services
./manage.sh start

# View logs
./manage.sh logs

# Check status
./manage.sh status
```

### Production Deployment
```bash
# Initial deployment
./manage.sh deploy

# Update deployment
./manage.sh update
```

## 📐 Detection Logic

### Squat State Machine

```
                ┌─────────────┐
         ┌──────│   STANDING  │◄─────────┐
         │      └──────┬──────┘          │
         │             │                 │
         │    knee angle > 160°         │
         │             │                 │
         │             ▼                 │
         │      ┌──────────────┐         │
         │      │  DESCENDING  │         │
         │      └──────┬───────┘         │
         │             │                 │
         │    knee angle < threshold    knee angle > 160°
         │             │                 │
         │             ▼                 │
         │      ┌──────────────┐         │
         │      │ BOTTOM/HOLD  │─────────┤
         │      └──────┬───────┘         │
         │             │                 │
         │    knee angle increasing     │
         │             │                 │
         │             ▼                 │
         │      ┌──────────────┐         │
         └──────│  ASCENDING   │─────────┘
                └──────────────┘
```

### Key Angles & Thresholds

| Parameter | Default | Description |
|-----------|---------|-------------|
| KNEE_STANDING_ANGLE | 160° | Minimum angle for standing position |
| KNEE_BOTTOM_ANGLE | 90° | Target angle for squat bottom |
| HIP_ANGLE_MIN | 70° | Minimum acceptable hip hinge |
| TRUNK_LEAN_MAX | 45° | Maximum forward lean |
| KNEE_VALGUS_THRESHOLD | 15° | Maximum inward knee deviation |

### Form Quality Scoring

```typescript
interface FormScore {
  depth: number;        // 0-100: How deep the squat
  kneeTracking: number; // 0-100: Knees over toes
  trunkPosition: number;// 0-100: Upright posture
  symmetry: number;     // 0-100: Left/right balance
  overall: number;      // Weighted average
}
```

## 🎨 Exercise Definitions

Exercises are defined with a declarative schema:

```typescript
{
  name: "Bodyweight Squat",
  type: "repetition", // or "hold"
  checkpoints: [
    { name: "standing", conditions: { kneeAngle: ">160" } },
    { name: "bottom", conditions: { kneeAngle: "<100" } }
  ],
  formChecks: [
    { name: "depth", rule: "kneeAngle < 90", weight: 0.3 },
    { name: "kneeTracking", rule: "kneeValgus < 15", weight: 0.25 },
    { name: "trunkLean", rule: "trunkAngle < 45", weight: 0.25 },
    { name: "symmetry", rule: "asymmetry < 10", weight: 0.2 }
  ],
  guidance: {
    cues: ["Push knees out", "Chest up", "Weight in heels"],
    demo: "/exercises/squat-demo.json" // 2D skeleton animation
  }
}
```

## 🔧 Parameter Tuning

### Camera Setup
- **Position**: Camera should be at hip height, 6-10 feet away
- **Angle**: Side view works best for squat depth detection
- **Lighting**: Ensure good contrast between body and background

### Adjusting Thresholds

Edit `frontend/utils/pose/config.ts`:

```typescript
export const SQUAT_CONFIG = {
  // Stricter depth requirement
  KNEE_BOTTOM_ANGLE: 85, // Lower = deeper squat required
  
  // More lenient trunk lean
  TRUNK_LEAN_MAX: 50, // Higher = more lean allowed
  
  // Sensitive to knee valgus
  KNEE_VALGUS_THRESHOLD: 10, // Lower = stricter
}
```

### Per-User Calibration

The system supports per-user calibration stored in the database:

```typescript
await api.post('/users/me/calibration', {
  standingKneeAngle: 165, // User's natural standing angle
  mobilityLimit: 95,      // User's max comfortable squat depth
  asymmetryBaseline: 5    // User's natural asymmetry
});
```

## 📊 Data Storage Format

### Keypoint Sequence (for ML training)

```json
{
  "sessionId": "uuid",
  "exerciseId": "squat",
  "timestamp": 1699123456789,
  "frameRate": 30,
  "frames": [
    {
      "t": 0,
      "keypoints": {
        "nose": [0.5, 0.1, 0.99],
        "leftShoulder": [0.4, 0.25, 0.98],
        "rightShoulder": [0.6, 0.25, 0.97],
        // ... 33 total landmarks
      },
      "angles": {
        "leftKnee": 165,
        "rightKnee": 163,
        "leftHip": 175,
        "rightHip": 174,
        "trunk": 5
      },
      "state": "standing",
      "repCount": 0
    }
  ],
  "summary": {
    "totalReps": 10,
    "averageFormScore": 85,
    "duration": 120
  }
}
```

## 🔒 Security

- JWT authentication with refresh tokens
- Role-based access control (Physio, Patient)
- Patients can only access their own data
- Physios can view assigned patients only
- No raw video stored (privacy by design)

## 📦 Deployment

### Domain
- Production: `physio.kitt.deploid.io`

### Infrastructure
- Docker Compose orchestration
- Caddy reverse proxy with auto-HTTPS
- PostgreSQL for persistence
- Systemd for auto-restart

### CLI Commands
```bash
physio-tracker start    # Start all services
physio-tracker stop     # Stop all services
physio-tracker restart  # Restart all services
physio-tracker status   # Show service status
physio-tracker logs     # Follow logs
physio-tracker update   # Rebuild and deploy
physio-tracker backup   # Backup database
```

## 🧪 Testing

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# E2E tests
npm run test:e2e
```

## 📄 License

MIT License - See LICENSE file

## 🙏 Acknowledgments

- [MediaPipe](https://mediapipe.dev/) for the pose estimation model
- [Nuxt 3](https://nuxt.com/) for the amazing framework
- The physiotherapy community for domain expertise
