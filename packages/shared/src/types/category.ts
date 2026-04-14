export interface Category {
  id: string;
  couple_id: string | null;
  name: string;
  icon: string;
  color: string;
  is_default: boolean;
  name_translations: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryInsert {
  couple_id?: string | null;
  name: string;
  icon: string;
  color: string;
  is_default?: boolean;
  name_translations?: Record<string, string> | null;
}
