import type { Database } from './database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ItemRow = Database['public']['Tables']['items']['Row'];
export type ItemInsert = Database['public']['Tables']['items']['Insert'];
export type ClaimRow = Database['public']['Tables']['claims']['Row'];

export type ReportFormData = {
  title: string;
  description: string;
  item_type: 'lost' | 'found';
  category: string;
  location: string;
  city: string;
  zip_code: string;
  event_date: string;
  ai_summary: string;
};

export type ClaimFormData = {
  message: string;
  contact_email: string;
};

export type ClaimWithItem = ClaimRow & {
  items:
    | Pick<
        ItemRow,
        | 'id'
        | 'title'
        | 'item_type'
        | 'category'
        | 'location'
        | 'city'
        | 'zip_code'
        | 'status'
        | 'user_id'
      >
    | null;
};