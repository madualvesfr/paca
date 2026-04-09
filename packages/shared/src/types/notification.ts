export type NotificationType =
  | "transaction_added"
  | "budget_alert"
  | "goal_reached";

export interface Notification {
  id: string;
  couple_id: string;
  target_user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationInsert {
  couple_id: string;
  target_user_id: string;
  type: NotificationType;
  title: string;
  body: string;
}
