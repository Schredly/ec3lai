import type { GraphPackage } from "./graphContracts.js";

/**
 * O35: HR Lite — independently installable.
 */
export const hrLitePackage: GraphPackage = {
  key: "hr-lite",
  name: "HR Lite",
  version: "1.0.0",
  description: "Basic HR management: employees, departments, PTO requests",
  recordTypes: [
    {
      key: "hr_department",
      name: "Department",
      projectId: "", // set at install time
      fields: [
        { name: "name", type: "string", required: true },
        { name: "code", type: "string", required: true },
        { name: "head", type: "reference" },
      ],
    },
    {
      key: "hr_employee",
      name: "Employee",
      projectId: "",
      fields: [
        { name: "name", type: "string", required: true },
        { name: "email", type: "string", required: true },
        { name: "department", type: "reference" },
        { name: "start_date", type: "date" },
        { name: "role", type: "string" },
      ],
    },
    {
      key: "hr_pto_request",
      name: "PTO Request",
      projectId: "",
      fields: [
        { name: "employee", type: "reference", required: true },
        { name: "start_date", type: "date", required: true },
        { name: "end_date", type: "date", required: true },
        { name: "type", type: "choice" },
        { name: "status", type: "choice" },
        { name: "notes", type: "text" },
      ],
    },
  ],
  workflows: [
    {
      key: "hr_pto_approval",
      name: "PTO Approval",
      projectId: "",
      triggerType: "record_event",
      steps: [
        { stepType: "approval", orderIndex: 0 },
        { stepType: "notification", orderIndex: 1 },
      ],
    },
  ],
};

/**
 * O36: ITSM Lite — independently installable.
 */
export const itsmLitePackage: GraphPackage = {
  key: "itsm-lite",
  name: "ITSM Lite",
  version: "1.0.0",
  description: "Basic IT service management: incidents, problems, changes",
  recordTypes: [
    {
      key: "itsm_task",
      name: "ITSM Task",
      projectId: "",
      fields: [
        { name: "title", type: "string", required: true },
        { name: "description", type: "text" },
        { name: "status", type: "choice" },
        { name: "priority", type: "choice" },
        { name: "assigned_to", type: "reference" },
      ],
    },
    {
      key: "itsm_incident",
      name: "Incident",
      projectId: "",
      baseType: "itsm_task",
      fields: [
        { name: "severity", type: "choice", required: true },
        { name: "impact", type: "choice" },
        { name: "category", type: "choice" },
        { name: "resolution", type: "text" },
      ],
    },
    {
      key: "itsm_problem",
      name: "Problem",
      projectId: "",
      baseType: "itsm_task",
      fields: [
        { name: "root_cause", type: "text" },
        { name: "workaround", type: "text" },
        { name: "related_incidents", type: "reference" },
      ],
    },
    {
      key: "itsm_change_request",
      name: "Change Request",
      projectId: "",
      baseType: "itsm_task",
      fields: [
        { name: "risk_level", type: "choice" },
        { name: "implementation_plan", type: "text" },
        { name: "rollback_plan", type: "text" },
        { name: "scheduled_date", type: "datetime" },
      ],
    },
  ],
  workflows: [
    {
      key: "itsm_incident_workflow",
      name: "Incident Response",
      projectId: "",
      triggerType: "record_event",
      steps: [
        { stepType: "assignment", orderIndex: 0 },
        { stepType: "notification", orderIndex: 1 },
      ],
    },
    {
      key: "itsm_change_approval",
      name: "Change Approval",
      projectId: "",
      triggerType: "record_event",
      steps: [
        { stepType: "approval", orderIndex: 0 },
        { stepType: "notification", orderIndex: 1 },
      ],
    },
  ],
};

export const builtinPackages: GraphPackage[] = [
  hrLitePackage,
  itsmLitePackage,
];
