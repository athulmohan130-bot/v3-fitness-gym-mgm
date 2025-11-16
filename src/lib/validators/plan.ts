import * as z from "zod";

export const planSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  type: z.enum(["Cardio", "Bodybuilding"], {
    required_error: "Please select a plan type",
  }),
  price: z.number()
    .min(1, "Price must be at least ₹1")
    .max(100000, "Price cannot exceed ₹1,00,000")
    .refine((val) => val > 0, "Price is required and must be greater than 0"),
  registrationFee: z.number()
    .min(0, "Registration fee cannot be negative")
    .max(50000, "Registration fee cannot exceed ₹50,000")
    .optional()
    .default(0),
  durationInDays: z.number().min(1, "Duration must be at least 1 day"),
  features: z
    .array(z.object({ value: z.string().min(1, "Feature cannot be empty.") }))
    .min(1, "At least one feature is required."),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type PlanFormData = z.infer<typeof planSchema>;

export const defaultPlanValues: PlanFormData = {
  name: "",
  type: "Cardio",
  price: 0,
  registrationFee: 0,
  durationInDays: 30,
  features: [{ value: "" }],
  status: "active",
};
