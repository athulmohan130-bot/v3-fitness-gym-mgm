/**
 * Plan Proration Utilities
 * Handles calculations for early plan upgrades with prorated pricing
 */

import { differenceInDays, parseISO } from "date-fns";

export interface ProrationCalculation {
  // Current plan details
  currentPlanPrice: number;
  currentPlanDuration: number;
  daysRemaining: number;
  unusedValue: number;

  // New plan details
  newPlanPrice: number;
  newPlanDuration: number;

  // Calculation results
  proratedDiscount: number;
  finalPayableAmount: number;
  savingsPercentage: number;

  // Metadata
  isEarlyUpgrade: boolean;
  upgradeMessage: string;
}

/**
 * Calculates the prorated amount for an early plan upgrade
 * 
 * @param currentPlanPrice - Price of the current active plan
 * @param currentPlanDuration - Duration of current plan in days
 * @param currentEndDate - ISO date string of when current plan expires
 * @param newPlanPrice - Price of the new plan to upgrade to
 * @param newPlanDuration - Duration of new plan in days
 * @returns ProrationCalculation object with detailed breakdown
 */
export function calculateProratedAmount(
  currentPlanPrice: number,
  currentPlanDuration: number,
  currentEndDate: string,
  newPlanPrice: number,
  newPlanDuration: number
): ProrationCalculation {
  const now = new Date();
  const endDate = parseISO(currentEndDate);
  
  // Calculate days remaining in current plan
  const daysRemaining = Math.max(0, differenceInDays(endDate, now));
  
  // Check if this is an early upgrade (plan not expired yet)
  const isEarlyUpgrade = daysRemaining > 0;
  
  // Calculate unused value of current plan
  // Formula: (daysRemaining / totalPlanDays) * planPrice
  const unusedValue = isEarlyUpgrade 
    ? (daysRemaining / currentPlanDuration) * currentPlanPrice
    : 0;
  
  // Calculate prorated discount (unused value applied to new plan)
  const proratedDiscount = Math.min(unusedValue, newPlanPrice); // Can't exceed new plan price
  
  // Final payable amount
  const finalPayableAmount = Math.max(0, newPlanPrice - proratedDiscount);
  
  // Calculate savings percentage
  const savingsPercentage = newPlanPrice > 0 
    ? (proratedDiscount / newPlanPrice) * 100 
    : 0;
  
  // Generate upgrade message
  let upgradeMessage = "";
  if (isEarlyUpgrade) {
    upgradeMessage = `You have ${daysRemaining} day(s) remaining. Unused value of ₹${Math.round(unusedValue)} will be adjusted.`;
  } else {
    upgradeMessage = "Your current plan has expired. Full payment required.";
  }
  
  return {
    currentPlanPrice,
    currentPlanDuration,
    daysRemaining,
    unusedValue: Math.round(unusedValue),
    newPlanPrice,
    newPlanDuration,
    proratedDiscount: Math.round(proratedDiscount),
    finalPayableAmount: Math.round(finalPayableAmount),
    savingsPercentage: Math.round(savingsPercentage * 10) / 10, // Round to 1 decimal
    isEarlyUpgrade,
    upgradeMessage,
  };
}

/**
 * Checks if a plan change qualifies as an upgrade (higher price or longer duration)
 */
export function isUpgrade(
  currentPlanPrice: number,
  newPlanPrice: number,
  currentPlanDuration: number,
  newPlanDuration: number
): boolean {
  return newPlanPrice > currentPlanPrice || newPlanDuration > currentPlanDuration;
}

/**
 * Checks if a plan change qualifies as a downgrade
 */
export function isDowngrade(
  currentPlanPrice: number,
  newPlanPrice: number,
  currentPlanDuration: number,
  newPlanDuration: number
): boolean {
  return newPlanPrice < currentPlanPrice && newPlanDuration <= currentPlanDuration;
}

/**
 * Determines the type of plan change
 */
export function getPlanChangeType(
  currentPlanPrice: number,
  newPlanPrice: number,
  currentPlanDuration: number,
  newPlanDuration: number
): "upgrade" | "downgrade" | "similar" | "renewal" {
  if (currentPlanPrice === newPlanPrice && currentPlanDuration === newPlanDuration) {
    return "renewal";
  }
  
  if (isUpgrade(currentPlanPrice, newPlanPrice, currentPlanDuration, newPlanDuration)) {
    return "upgrade";
  }
  
  if (isDowngrade(currentPlanPrice, newPlanPrice, currentPlanDuration, newPlanDuration)) {
    return "downgrade";
  }
  
  return "similar";
}
