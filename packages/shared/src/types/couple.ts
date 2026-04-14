export interface Couple {
  id: string;
  invite_code: string;
  partner_since: string;
  primary_currency: string;
  auto_convert_currency: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CoupleInsert {
  invite_code: string;
  partner_since?: string;
  created_by: string;
}

export interface CoupleWithPartner extends Couple {
  partner: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}
