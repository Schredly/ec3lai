import type { ValidatedGraphPackage } from "./graphPackageSchema.js";

/**
 * Starter templates for Vibe Studio.
 */

export const vibeTemplates: Record<string, { name: string; description: string; prompt: string }> = {
  onboarding: {
    name: "Employee Onboarding",
    description: "Track new hire onboarding tasks and milestones",
    prompt: "Create an employee onboarding app with record types for onboarding tasks, new hire profiles, and equipment requests. Include an approval workflow for equipment requests.",
  },
  pto: {
    name: "PTO Manager",
    description: "Manage time-off requests with approval workflows",
    prompt: "Create a PTO management app with record types for PTO requests, PTO policies, and employee balances. Include an approval workflow for PTO requests.",
  },
  vendor_intake: {
    name: "Vendor Intake",
    description: "Manage vendor onboarding and compliance",
    prompt: "Create a vendor intake app with record types for vendors, compliance documents, and review tasks. Include an approval workflow for vendor applications.",
  },
  ticketing: {
    name: "IT Ticketing",
    description: "Basic IT support ticket management",
    prompt: "Create an IT ticketing app with record types for tickets, categories, and SLA configs. Include an assignment workflow for new tickets.",
  },
};

export function getTemplatePrompt(templateKey: string): string | undefined {
  return vibeTemplates[templateKey]?.prompt;
}

export function listTemplates(): { key: string; name: string; description: string }[] {
  return Object.entries(vibeTemplates).map(([key, tmpl]) => ({
    key,
    name: tmpl.name,
    description: tmpl.description,
  }));
}
