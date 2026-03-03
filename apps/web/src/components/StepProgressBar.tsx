"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface StepProgressBarProps {
    currentStep: number;
    totalSteps: number;
    steps: string[];
}

export function StepProgressBar({ currentStep, totalSteps, steps }: StepProgressBarProps) {
    return (
        <div className="w-full max-w-4xl mx-auto mb-12">
            <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                    const stepNum = index + 1;
                    const isCompleted = currentStep > stepNum;
                    const isActive = currentStep === stepNum;

                    return (
                        <div key={step} className="flex flex-col items-center gap-2 relative flex-1 last:flex-none">
                            <div className="flex items-center w-full">
                                <div
                                    className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all duration-500 relative z-10",
                                        isCompleted ? "bg-accent-teal border-accent-teal shadow-[0_0_15px_rgba(0,255,209,0.4)]" :
                                            isActive ? "bg-background border-accent-teal shadow-[0_0_10px_rgba(0,255,209,0.2)]" :
                                                "bg-background border-white/5 text-muted"
                                    )}
                                >
                                    {isCompleted ? (
                                        <Check className="w-6 h-6 text-background" />
                                    ) : (
                                        <span className={cn("text-sm font-bold", isActive ? "text-accent-teal" : "")}>
                                            {String(stepNum).padStart(2, '0')}
                                        </span>
                                    )}
                                </div>

                                {index < totalSteps - 1 && (
                                    <div className="flex-1 h-[2px] bg-white/5 mx-[-2px]">
                                        <div
                                            className="h-full bg-accent-teal transition-all duration-500"
                                            style={{ width: isCompleted ? '100%' : '0%' }}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="absolute top-12 whitespace-nowrap">
                                <span className={cn(
                                    "text-[9px] uppercase tracking-[0.2em] font-bold transition-colors",
                                    isActive ? "text-accent-teal" : "text-muted"
                                )}>
                                    {step}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
