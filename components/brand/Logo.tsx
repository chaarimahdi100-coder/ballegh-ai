"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "full" | "icon" | "horizontal";
  theme?: "light" | "dark";
  className?: string;
  size?: "sm" | "md" | "lg";
  href?: string;
}

export function Logo({
  variant = "full",
  theme = "light",
  className,
  size = "md",
  href = "/",
}: LogoProps) {
  const sizeConfig = {
    sm: {
      dim: 32,
      svgClass: "w-8 h-8",
      titleClass: "text-lg",
      badgeClass: "text-[10px] px-1 py-0.5",
      subClass: "text-[9px]",
    },
    md: {
      dim: 40,
      svgClass: "w-10 h-10",
      titleClass: "text-xl",
      badgeClass: "text-xs px-1.5 py-0.5",
      subClass: "text-[10px]",
    },
    lg: {
      dim: 56,
      svgClass: "w-14 h-14",
      titleClass: "text-2xl",
      badgeClass: "text-xs px-2 py-0.5",
      subClass: "text-xs",
    },
  };

  const current = sizeConfig[size];
  const isDark = theme === "dark";

  const content = (
    <div className={cn("inline-flex items-center gap-2 select-none", className)}>
      {variant === "icon" ? (
        // Compact Icon
        <svg
          width={current.dim}
          height={current.dim}
          viewBox="0 0 100 100"
          className={cn(current.svgClass, "shrink-0 transition-transform hover:scale-105")}
          style={{ width: current.dim, height: current.dim, minWidth: current.dim, minHeight: current.dim }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="logoIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#02C39A" />
              <stop offset="50%" stopColor="#00A896" />
              <stop offset="100%" stopColor="#028090" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" rx="22" fill="#0B132B" />
          <path
            d="M 64 24 A 36 36 0 0 1 84 55"
            stroke="#02C39A"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.8"
          />
          <path
            d="M 69 16 A 46 46 0 0 1 93 55"
            stroke="#5CE1E6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="3 4"
            opacity="0.6"
          />
          <path
            d="M 50 14 C 32.3 14 18 28.3 18 46 C 18 64 45 83 48.5 85.4 C 49.4 86.1 50.6 86.1 51.5 85.4 C 55 83 82 64 82 46 C 82 28.3 67.7 14 50 14 Z"
            fill="url(#logoIconGrad)"
          />
          <circle cx="50" cy="44" r="19" fill="#0B132B" />
          <path
            d="M 41 44 L 47 50 L 59 38"
            stroke="#02C39A"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="59" cy="38" r="2.5" fill="#5CE1E6" />
        </svg>
      ) : (
        // Full Logo
        <div className="flex items-center gap-3">
          <svg
            width={current.dim}
            height={current.dim}
            viewBox="0 0 100 100"
            className={cn(current.svgClass, "shrink-0 transition-transform hover:scale-105")}
            style={{ width: current.dim, height: current.dim, minWidth: current.dim, minHeight: current.dim }}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="logoFullGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#02C39A" />
                <stop offset="50%" stopColor="#00A896" />
                <stop offset="100%" stopColor="#028090" />
              </linearGradient>
            </defs>
            <rect width="100" height="100" rx="22" fill="#0B132B" />
            <path
              d="M 64 24 A 36 36 0 0 1 84 55"
              stroke="#02C39A"
              strokeWidth="3.5"
              strokeLinecap="round"
              opacity="0.8"
            />
            <path
              d="M 69 16 A 46 46 0 0 1 93 55"
              stroke="#5CE1E6"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="3 4"
              opacity="0.6"
            />
            <path
              d="M 50 14 C 32.3 14 18 28.3 18 46 C 18 64 45 83 48.5 85.4 C 49.4 86.1 50.6 86.1 51.5 85.4 C 55 83 82 64 82 46 C 82 28.3 67.7 14 50 14 Z"
              fill="url(#logoFullGrad)"
            />
            <circle cx="50" cy="44" r="19" fill="#0B132B" />
            <path
              d="M 41 44 L 47 50 L 59 38"
              stroke="#02C39A"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="59" cy="38" r="2.5" fill="#5CE1E6" />
          </svg>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "font-extrabold tracking-tight leading-none",
                  current.titleClass,
                  isDark ? "text-white" : "text-brand-navy-900"
                )}
              >
                BALLEGH
              </span>
              <span className={cn("bg-brand-teal-600 text-white font-black rounded tracking-wide leading-none", current.badgeClass)}>
                AI
              </span>
            </div>
            <span
              className={cn(
                "font-semibold tracking-wider uppercase mt-1",
                current.subClass,
                isDark ? "text-brand-teal-300" : "text-brand-navy-600"
              )}
            >
              Civic-Tech • Tunis
            </span>
          </div>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal-500 rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
}
