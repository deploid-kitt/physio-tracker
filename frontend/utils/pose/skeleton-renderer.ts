// Canvas-based skeleton renderer for pose visualization
import { SKELETON_CONNECTIONS, LANDMARKS, getScoreColor, POSE_CONFIG } from './config';
import type { FormScores, SquatState } from './squat-detector';

interface RenderOptions {
  showKeypoints: boolean;
  showSkeleton: boolean;
  showAngles: boolean;
  showFeedback: boolean;
  keypointRadius: number;
  lineWidth: number;
  color: string;
}

const DEFAULT_OPTIONS: RenderOptions = {
  showKeypoints: true,
  showSkeleton: true,
  showAngles: true,
  showFeedback: true,
  keypointRadius: 6,
  lineWidth: 3,
  color: '#6366f1', // Primary color
};

export class SkeletonRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private options: RenderOptions;

  constructor(canvas: HTMLCanvasElement, options: Partial<RenderOptions> = {}) {
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  setOptions(options: Partial<RenderOptions>): void {
    this.options = { ...this.options, ...options };
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  /**
   * Render the full skeleton overlay
   */
  render(
    landmarks: any[],
    state?: SquatState,
    formScores?: FormScores,
    repCount?: number,
    feedback?: { issues: string[]; cues: string[] }
  ): void {
    this.clear();

    if (!landmarks || landmarks.length === 0) return;

    // Draw skeleton connections
    if (this.options.showSkeleton) {
      this.drawSkeleton(landmarks, formScores?.overall);
    }

    // Draw keypoints
    if (this.options.showKeypoints) {
      this.drawKeypoints(landmarks);
    }

    // Draw angle visualizations
    if (this.options.showAngles) {
      this.drawAngleArcs(landmarks);
    }

    // Draw state indicator
    if (state) {
      this.drawStateIndicator(state);
    }

    // Draw rep counter
    if (repCount !== undefined) {
      this.drawRepCounter(repCount);
    }

    // Draw feedback
    if (this.options.showFeedback && feedback) {
      this.drawFeedback(feedback.issues, feedback.cues);
    }
  }

  private drawSkeleton(landmarks: any[], formScore?: number): void {
    const color = formScore !== undefined ? getScoreColor(formScore) : this.options.color;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = this.options.lineWidth;
    this.ctx.lineCap = 'round';

    for (const [startIdx, endIdx] of SKELETON_CONNECTIONS) {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];

      if (!start || !end) continue;
      if ((start.visibility ?? 1) < POSE_CONFIG.VISIBILITY_THRESHOLD) continue;
      if ((end.visibility ?? 1) < POSE_CONFIG.VISIBILITY_THRESHOLD) continue;

      const startX = start.x * this.width;
      const startY = start.y * this.height;
      const endX = end.x * this.width;
      const endY = end.y * this.height;

      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(endX, endY);
      this.ctx.stroke();
    }
  }

  private drawKeypoints(landmarks: any[]): void {
    // Important keypoints to highlight
    const importantPoints = [
      LANDMARKS.LEFT_SHOULDER, LANDMARKS.RIGHT_SHOULDER,
      LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP,
      LANDMARKS.LEFT_KNEE, LANDMARKS.RIGHT_KNEE,
      LANDMARKS.LEFT_ANKLE, LANDMARKS.RIGHT_ANKLE,
    ];

    landmarks.forEach((lm, idx) => {
      if (!lm || (lm.visibility ?? 1) < POSE_CONFIG.VISIBILITY_THRESHOLD) return;

      const x = lm.x * this.width;
      const y = lm.y * this.height;
      const isImportant = importantPoints.includes(idx);
      const radius = isImportant ? this.options.keypointRadius : this.options.keypointRadius * 0.6;

      // Outer circle
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
      this.ctx.fillStyle = isImportant ? this.options.color : 'rgba(99, 102, 241, 0.5)';
      this.ctx.fill();

      // Inner circle for important points
      if (isImportant) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius * 0.4, 0, 2 * Math.PI);
        this.ctx.fillStyle = 'white';
        this.ctx.fill();
      }
    });
  }

  private drawAngleArcs(landmarks: any[]): void {
    // Draw knee angle arcs
    this.drawAngleArc(
      landmarks[LANDMARKS.LEFT_HIP],
      landmarks[LANDMARKS.LEFT_KNEE],
      landmarks[LANDMARKS.LEFT_ANKLE],
      'L'
    );

    this.drawAngleArc(
      landmarks[LANDMARKS.RIGHT_HIP],
      landmarks[LANDMARKS.RIGHT_KNEE],
      landmarks[LANDMARKS.RIGHT_ANKLE],
      'R'
    );
  }

  private drawAngleArc(
    point1: any,
    vertex: any,
    point2: any,
    label: string
  ): void {
    if (!point1 || !vertex || !point2) return;
    if ((vertex.visibility ?? 1) < POSE_CONFIG.VISIBILITY_THRESHOLD) return;

    const vx = vertex.x * this.width;
    const vy = vertex.y * this.height;
    
    const angle1 = Math.atan2(
      point1.y * this.height - vy,
      point1.x * this.width - vx
    );
    const angle2 = Math.atan2(
      point2.y * this.height - vy,
      point2.x * this.width - vx
    );

    // Calculate angle in degrees
    let angleDeg = Math.abs((angle2 - angle1) * (180 / Math.PI));
    if (angleDeg > 180) angleDeg = 360 - angleDeg;

    // Draw arc
    const arcRadius = 25;
    this.ctx.beginPath();
    this.ctx.arc(vx, vy, arcRadius, angle1, angle2);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Draw angle text
    const midAngle = (angle1 + angle2) / 2;
    const textX = vx + Math.cos(midAngle) * (arcRadius + 15);
    const textY = vy + Math.sin(midAngle) * (arcRadius + 15);

    this.ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    this.ctx.fillStyle = 'white';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // Text background
    const text = `${Math.round(angleDeg)}°`;
    const metrics = this.ctx.measureText(text);
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(textX - metrics.width / 2 - 4, textY - 8, metrics.width + 8, 16);
    
    this.ctx.fillStyle = 'white';
    this.ctx.fillText(text, textX, textY);
  }

  private drawStateIndicator(state: SquatState): void {
    const stateLabels: Record<SquatState, string> = {
      standing: '🧍 Standing',
      descending: '⬇️ Going Down',
      bottom: '⏸️ Hold',
      ascending: '⬆️ Coming Up',
    };

    const stateColors: Record<SquatState, string> = {
      standing: '#6b7280',
      descending: '#3b82f6',
      bottom: '#22c55e',
      ascending: '#f59e0b',
    };

    const label = stateLabels[state];
    const color = stateColors[state];

    // Draw state badge
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.roundRect(10, 10, 130, 32, 8);
    this.ctx.fill();

    this.ctx.font = 'bold 14px Inter, system-ui, sans-serif';
    this.ctx.fillStyle = 'white';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(label, 20, 26);
  }

  private drawRepCounter(repCount: number): void {
    const x = this.width - 70;
    const y = 30;

    // Circle background
    this.ctx.beginPath();
    this.ctx.arc(x, y, 30, 0, 2 * Math.PI);
    this.ctx.fillStyle = 'rgba(99, 102, 241, 0.9)';
    this.ctx.fill();

    // Rep count
    this.ctx.font = 'bold 24px Inter, system-ui, sans-serif';
    this.ctx.fillStyle = 'white';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(repCount.toString(), x, y);

    // Label
    this.ctx.font = '10px Inter, system-ui, sans-serif';
    this.ctx.fillText('REPS', x, y + 20);
  }

  private drawFeedback(issues: string[], cues: string[]): void {
    if (issues.length === 0 && cues.length === 0) return;

    const startY = 60;
    let y = startY;

    // Draw issues (red)
    issues.slice(0, 2).forEach(issue => {
      this.drawFeedbackItem(issue, y, '#ef4444');
      y += 28;
    });

    // Draw cues (blue)
    cues.slice(0, 2).forEach(cue => {
      this.drawFeedbackItem(cue, y, '#3b82f6');
      y += 28;
    });
  }

  private drawFeedbackItem(text: string, y: number, color: string): void {
    const padding = 10;
    const maxWidth = this.width - 20;

    this.ctx.font = '13px Inter, system-ui, sans-serif';
    const metrics = this.ctx.measureText(text);
    const width = Math.min(metrics.width + padding * 2, maxWidth);

    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.beginPath();
    this.ctx.roundRect(10, y, width, 24, 6);
    this.ctx.fill();

    // Colored indicator
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.roundRect(10, y, 4, 24, [6, 0, 0, 6]);
    this.ctx.fill();

    // Text
    this.ctx.fillStyle = 'white';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, 20, y + 12);
  }

  /**
   * Draw a simple demo skeleton animation
   */
  drawDemoSkeleton(progress: number): void {
    this.clear();

    // Generate demo pose based on progress (0-1)
    const squat = Math.sin(progress * Math.PI) * 0.3; // 0 to 0.3 to 0

    const centerX = this.width / 2;
    const baseY = this.height * 0.3;

    // Simple stick figure
    const points = {
      head: { x: centerX, y: baseY - 30 },
      shoulder: { x: centerX, y: baseY },
      hip: { x: centerX, y: baseY + 60 + squat * 100 },
      leftKnee: { x: centerX - 20 - squat * 30, y: baseY + 120 + squat * 50 },
      rightKnee: { x: centerX + 20 + squat * 30, y: baseY + 120 + squat * 50 },
      leftAnkle: { x: centerX - 15, y: baseY + 180 },
      rightAnkle: { x: centerX + 15, y: baseY + 180 },
    };

    this.ctx.strokeStyle = this.options.color;
    this.ctx.lineWidth = 4;
    this.ctx.lineCap = 'round';

    // Draw body
    this.ctx.beginPath();
    this.ctx.moveTo(points.head.x, points.head.y);
    this.ctx.lineTo(points.shoulder.x, points.shoulder.y);
    this.ctx.lineTo(points.hip.x, points.hip.y);
    this.ctx.stroke();

    // Draw left leg
    this.ctx.beginPath();
    this.ctx.moveTo(points.hip.x, points.hip.y);
    this.ctx.lineTo(points.leftKnee.x, points.leftKnee.y);
    this.ctx.lineTo(points.leftAnkle.x, points.leftAnkle.y);
    this.ctx.stroke();

    // Draw right leg
    this.ctx.beginPath();
    this.ctx.moveTo(points.hip.x, points.hip.y);
    this.ctx.lineTo(points.rightKnee.x, points.rightKnee.y);
    this.ctx.lineTo(points.rightAnkle.x, points.rightAnkle.y);
    this.ctx.stroke();

    // Draw arms
    const armLength = 40;
    const armAngle = 0.3 + squat * 0.5;
    
    this.ctx.beginPath();
    this.ctx.moveTo(points.shoulder.x, points.shoulder.y);
    this.ctx.lineTo(points.shoulder.x - armLength * Math.cos(armAngle), points.shoulder.y + armLength * Math.sin(armAngle));
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(points.shoulder.x, points.shoulder.y);
    this.ctx.lineTo(points.shoulder.x + armLength * Math.cos(armAngle), points.shoulder.y + armLength * Math.sin(armAngle));
    this.ctx.stroke();

    // Draw head
    this.ctx.beginPath();
    this.ctx.arc(points.head.x, points.head.y - 15, 15, 0, 2 * Math.PI);
    this.ctx.fillStyle = this.options.color;
    this.ctx.fill();
  }
}

// Polyfill for roundRect if not available
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(
    x: number, y: number, w: number, h: number, r: number | number[]
  ) {
    const radii = typeof r === 'number' ? [r, r, r, r] : r;
    this.moveTo(x + radii[0], y);
    this.lineTo(x + w - radii[1], y);
    this.quadraticCurveTo(x + w, y, x + w, y + radii[1]);
    this.lineTo(x + w, y + h - radii[2]);
    this.quadraticCurveTo(x + w, y + h, x + w - radii[2], y + h);
    this.lineTo(x + radii[3], y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - radii[3]);
    this.lineTo(x, y + radii[0]);
    this.quadraticCurveTo(x, y, x + radii[0], y);
    return this;
  };
}
