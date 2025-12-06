// Database enum types - must match exactly with Postgres enums
export type AppStatus = 'applied' | 'shortlisted' | 'selected' | 'rejected' | 'completed';
export type EducationLevel = 'high_school' | 'associate' | 'bachelor' | 'master' | 'phd';
export type FinalDecision = 'would_hire' | 'would_not_hire';
export type InternshipStatus = 'open' | 'closed';
export type ProficiencyLevel = 'basic' | 'intermediate' | 'advanced';
export type UserRole = 'student' | 'company' | 'admin';
export type WorkMode = 'remote' | 'onsite' | 'hybrid';
export type WorkType = 'full_time' | 'part_time';