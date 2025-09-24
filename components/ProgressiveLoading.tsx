
import React, { useState, useEffect, useMemo } from 'react';

interface ProgressiveLoadingProps {
  steps: { text: string; duration: number }[];
  isComplete: boolean;
}

const MAX_PROGRESS_BEFORE_COMPLETION = 90;

const ProgressiveLoading: React.FC<ProgressiveLoadingProps> = ({ steps, isComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const totalDuration = useMemo(() => steps.reduce((acc, step) => acc + step.duration, 0), [steps]);
  
  const stepProgressPoints = useMemo(() => {
    const points = [0];
    let cumulativeDuration = 0;
    for (const step of steps) {
      cumulativeDuration += step.duration;
      points.push((cumulativeDuration / totalDuration) * MAX_PROGRESS_BEFORE_COMPLETION);
    }
    return points;
  }, [steps, totalDuration]);

  useEffect(() => {
    if (isComplete) return;

    let animationFrameId: number;
    const startTime = Date.now();

    const animate = () => {
      const elapsedTime = Date.now() - startTime;
      
      let currentStep = 0;
      let cumulativeDuration = 0;
      
      for(let i = 0; i < steps.length; i++) {
        cumulativeDuration += steps[i].duration;
        if (elapsedTime < cumulativeDuration) {
          currentStep = i;
          break;
        }
        if (i === steps.length - 1) {
          currentStep = i;
        }
      }
      setCurrentStepIndex(currentStep);

      const stepStartTime = currentStep === 0 ? 0 : steps.slice(0, currentStep).reduce((acc, s) => acc + s.duration, 0);
      const stepElapsedTime = elapsedTime - stepStartTime;
      const stepDuration = steps[currentStep].duration;
      const stepStartProgress = stepProgressPoints[currentStep];
      const stepEndProgress = stepProgressPoints[currentStep + 1];

      const currentProgress = stepStartProgress + (stepElapsedTime / stepDuration) * (stepEndProgress - stepStartProgress);
      
      setProgress(Math.min(currentProgress, MAX_PROGRESS_BEFORE_COMPLETION));

      if (elapsedTime < totalDuration) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setProgress(MAX_PROGRESS_BEFORE_COMPLETION);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [steps, totalDuration, stepProgressPoints, isComplete]);

  useEffect(() => {
    if (isComplete) {
      setProgress(100);
    }
  }, [isComplete]);

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="text-center w-full max-w-sm flex flex-col items-center" aria-live="polite" aria-busy="true">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full" viewBox="0 0 120 120">
          <circle
            className="text-border-light dark:text-border-dark"
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="60"
            cy="60"
          />
          <circle
            className="text-primary-light dark:text-primary-dark transition-all duration-300 ease-out"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="60"
            cy="60"
            transform="rotate(-90 60 60)"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
          {Math.floor(progress)}%
        </span>
      </div>
      <p className="mt-4 text-text-secondary-light dark:text-text-secondary-dark transition-opacity duration-300 min-h-[1.5rem]">
        {isComplete ? 'Done!' : (steps[currentStepIndex]?.text || 'Finalizing...')}
      </p>
    </div>
  );
};

export default ProgressiveLoading;
