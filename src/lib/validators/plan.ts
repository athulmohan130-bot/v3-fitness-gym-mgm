import * as z from "zod";

export const planSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  price: z.number().min(0, "Price must be a positive number"),
  durationInDays: z.number().min(1, "Duration must be at least 1 day"),
  features: z
    .array(z.object({ value: z.string().min(1, "Feature cannot be empty.") }))
    .min(1, "At least one feature is required."),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type PlanFormData = z.infer<typeof planSchema>;

export const defaultPlanValues: PlanFormData = {
  name: "",
  price: 0,
  durationInDays: 30,
  features: [{ value: "" }],
  status: "active",
};
