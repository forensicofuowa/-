"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface UiverseCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  name?: string;
  value?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  ariaLabel?: string;
  className?: string;
}

export function UiverseCheckbox({
  checked,
  onChange,
  name,
  value,
  disabled = false,
  size = "md",
  ariaLabel,
  className,
}: UiverseCheckboxProps) {
  return (
    <label
      className={cn(
        "flp-uiverse-check",
        size === "sm" && "flp-uiverse-check--sm",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="checkmark" />
    </label>
  );
}
