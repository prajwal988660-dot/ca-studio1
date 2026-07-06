'use client';

import { Check } from 'lucide-react';

interface WizardStepsProps {
  steps: string[];
  currentStep: number;
}

export function WizardSteps({ steps, currentStep }: WizardStepsProps) {
  return (
    <div className="flex w-full mb-12 relative px-4">
      {/* Background Track */}
      <div className="absolute top-4 left-8 right-8 h-[2px] bg-slate-100 -z-10 rounded-full" />
      
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isPast = index < currentStep;
        return (
          <div key={step} className="flex-1 flex flex-col items-center relative group">
            {/* Active/Past Track Fill */}
            {index < steps.length - 1 && (
              <div 
                className="absolute top-4 left-1/2 w-full h-[2px] origin-left transition-all duration-700 ease-in-out z-0" 
                style={{ 
                  backgroundColor: isPast ? '#2563eb' : 'transparent',
                  transform: isPast ? 'scaleX(1)' : 'scaleX(0)'
                }} 
              />
            )}
            
            {/* Step Node */}
            <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-[2.5px] transition-all duration-500 ease-out
              ${isActive ? 'border-blue-600 bg-white shadow-[0_0_0_6px_rgba(37,99,235,0.1)] scale-110' 
                : isPast ? 'border-blue-600 bg-blue-600 scale-100' 
                : 'border-slate-200 bg-white scale-100'}`}
            >
               {isPast ? (
                 <Check className="w-4 h-4 text-white" strokeWidth={3} />
               ) : (
                 <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ease-out
                   ${isActive ? 'bg-blue-600 scale-100 opacity-100' : 'bg-slate-200 scale-50 opacity-0'}`} 
                 />
               )}
            </div>
            
            {/* Step Label */}
            <span className={`absolute top-11 text-[11px] font-bold tracking-widest uppercase transition-all duration-300
              ${isActive ? 'text-blue-600 translate-y-0 opacity-100' 
                : isPast ? 'text-slate-600 translate-y-0 opacity-100' 
                : 'text-slate-400 translate-y-1 opacity-70'}`}
            >
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}
