import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

export const UserSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).optional(),
  roleId: z.string().uuid({ message: "Invalid role selection" }),
  departmentId: z.string().uuid().optional().or(z.literal("")),
});

export const FacultySchema = z.object({
  name: z.string().min(2, { message: "Faculty name must be at least 2 characters" }),
  code: z.string().min(2, { message: "Code must be at least 2 characters" }),
});

export const DepartmentSchema = z.object({
  name: z.string().min(2, { message: "Department name must be at least 2 characters" }),
  code: z.string().min(2, { message: "Code must be at least 2 characters" }),
  facultyId: z.string().uuid({ message: "Invalid faculty selection" }),
});

export const AssetCategorySchema = z.object({
  name: z.string().min(2, { message: "Category name must be at least 2 characters" }),
  code: z.string().min(2, { message: "Code must be at least 2 characters" }),
  description: z.string().optional(),
});

export const AssetRegistrationSchema = z.object({
  name: z.string().min(2, { message: "Asset name must be at least 2 characters" }),
  assetCode: z.string().min(3, { message: "Asset code must be at least 3 characters" }),
  serialNumber: z.string().min(3, { message: "Serial number must be at least 3 characters" }),
  description: z.string().optional(),
  categoryId: z.string().uuid({ message: "Invalid category selection" }),
  departmentId: z.string().uuid({ message: "Invalid department selection" }),
  imageUrl: z.string().url({ message: "Invalid image URL" }).optional().or(z.literal("")),
});

export const AssignmentSchema = z.object({
  assetId: z.string().uuid(),
  assignedToId: z.string().uuid().optional().or(z.literal("")),
  departmentId: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().optional(),
}).refine(data => data.assignedToId || data.departmentId, {
  message: "Must assign to either a staff member or a department",
  path: ["assignedToId"],
});

export const TransferRequestSchema = z.object({
  assetId: z.string().uuid(),
  toDepartmentId: z.string().uuid().optional().or(z.literal("")),
  toUserId: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().optional(),
}).refine(data => data.toDepartmentId || data.toUserId, {
  message: "Must specify either a target department or user",
  path: ["toUserId"],
});

export const ReturnSchema = z.object({
  assetId: z.string().uuid(),
  conditionAtReturn: z.enum(["GOOD", "DAMAGED"]),
  notes: z.string().optional(),
});

export const MaintenanceRequestSchema = z.object({
  assetId: z.string().uuid(),
  description: z.string().min(5, { message: "Description must be at least 5 characters" }),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
});

export const MaintenanceUpdateSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]),
  assignedToId: z.string().uuid().optional().or(z.literal("")),
  cost: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

export const DisposalSchema = z.object({
  assetId: z.string().uuid(),
  reason: z.string().min(5, { message: "Reason must be at least 5 characters" }),
  method: z.string().min(2, { message: "Method must be at least 2 characters" }),
  notes: z.string().optional(),
});
