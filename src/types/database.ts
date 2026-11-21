export type UserRole = "student" | "instructor" | "admin" | "super_admin";
export type AccountStatus = "pending" | "active" | "disabled";
export type LectureStatus = "draft" | "published" | "archived";
export type FileStatus = "pending" | "ready";
export type FileCategory = "theory" | "practical";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  organization_id: string | null;
  department_id: string | null;
  stage_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Stage {
  id: string;
  department_id: string;
  name: string;
  level_number: number;
  is_archived: boolean;
}

export interface AcademicYear {
  id: string;
  organization_id: string;
  label: string;
  is_current: boolean;
  is_archived: boolean;
}

export interface Subject {
  id: string;
  department_id: string;
  stage_id: string;
  name: string;
  code: string | null;
  description: string | null;
  is_archived: boolean;
  stages?: { name: string } | null;
}

export interface LectureFile {
  id: string;
  lecture_id: string;
  storage_path: string;
  original_name: string;
  ext: string;
  mime_type: string;
  size_bytes: number;
  category: FileCategory;
  status: FileStatus;
  sort_order: number;
  created_by: string;
  finalized_at: string | null;
  created_at: string;
}

export interface Lecture {
  id: string;
  department_id: string;
  subject_id: string;
  academic_year_id: string;
  uploader_id: string;
  lecture_number: number;
  semester: number;
  title: string;
  description: string | null;
  status: LectureStatus;
  created_at: string;
  updated_at: string;
}

export interface ParsedBatchLecture {
  tempId: string;
  lectureNumber: number;
  semester: number;
  category: FileCategory;
  title: string;
  description: string;
  selected: boolean;
  sourceFile?: File;
  sourceFileName?: string;
}
