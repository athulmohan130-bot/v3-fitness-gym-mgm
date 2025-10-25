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

      // Add currency symbol manually to ensure correct symbol
      const currencySymbol = currency === "INR" ? "₹" : currency;
      return `${currencySymbol} ${numberFormatted}`;
    } catch (e) {
      // Fallback
      return `${currency} ${value}`;
    }
  }, [value, currency, locale, maximumFractionDigits]);

  return <span className={className}>{formatted}</span>;
}
