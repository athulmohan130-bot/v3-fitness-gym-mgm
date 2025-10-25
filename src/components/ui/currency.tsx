"use client";

import React from "react";

interface CurrencyProps {
  value: number;
  currency?: string; // ISO 4217, default INR
  locale?: string; // locale for formatting, default en-IN
  maximumFractionDigits?: number;
  className?: string;
}

export default function Currency({
  value,
  currency = "INR",
  locale = "en-IN",
  maximumFractionDigits = 0,
  className,
}: CurrencyProps) {
  const formatted = React.useMemo(() => {
    try {
      // Format the number without currency symbol
      const numberFormatted = new Intl.NumberFormat(locale, {
        maximumFractionDigits,
        minimumFractionDigits: maximumFractionDigits,
      }).format(value);

      return numberFormatted;
    } catch (e) {
      // Fallback
      return value.toString();
    }
  }, [value, locale, maximumFractionDigits]);

  const currencySymbol = currency === "INR" ? "₹" : "$";

  return (
    <span className={className}>
      <span className="font-sans">{currencySymbol}</span> {formatted}
    </span>
  );
}
