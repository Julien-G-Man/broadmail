export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "sender";
  is_active: boolean;
  created_at: string;
}

export interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  custom_fields: Record<string, unknown>;
  is_suppressed: boolean;
  suppression_reason: string | null;
  suppressed_at: string | null;
  created_at: string;
}

export interface ContactList {
  id: string;
  name: string;
  description: string | null;
  org_tag: string;
  created_at: string;
  member_count: number;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_body: string;
  text_body: string | null;
  variables: string[];
  mode: string;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  from_name: string;
  from_email: string;
  reply_to: string | null;
  template_id: string | null;
  list_ids: string[];
  status: "draft" | "scheduled" | "queued" | "sending" | "sent" | "failed" | "cancelled";
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  total_recipients: number;
  error_message: string | null;
  created_at: string;
}

export interface SendCampaignResponse {
  campaign: Campaign;
  delivery_mode: "queue" | "inline";
}

export interface CampaignStats {
  total_recipients: number;
  sent: number;
  failed: number;
  skipped: number;
  pending: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  open_rate: number;
  click_rate: number;
}

export interface EmailEvent {
  id: string;
  campaign_id: string | null;
  contact_id: string | null;
  event_type: string;
  url: string | null;
  occurred_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface OverviewStats {
  total_contacts: number;
  total_campaigns: number;
  total_sent: number;
  overall_open_rate: number;
  overall_click_rate: number;
  recent_campaigns: {
    id: string;
    name: string;
    status: string;
    total_recipients: number;
    created_at: string;
  }[];
}
