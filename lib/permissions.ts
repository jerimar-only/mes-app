export type Role = "ADMINISTRATOR" | "ENCODER";

export const permissions = {
  createUser: (role: Role) => role === "ADMINISTRATOR",
  editSavedRecord: (role: Role) => role === "ADMINISTRATOR",
  createRecord: (role: Role) => role === "ADMINISTRATOR" || role === "ENCODER",
  uploadExcel: (role: Role) => role === "ADMINISTRATOR" || role === "ENCODER",
  printRecords: (role: Role) => role === "ADMINISTRATOR" || role === "ENCODER",
} as const;
