import { AdminFeedback } from "@/components/admin/admin-feedback";

type SupportPointsFeedbackProps = {
  type: "success" | "error";
  message: string;
};

export function SupportPointsFeedback({ type, message }: SupportPointsFeedbackProps) {
  return <AdminFeedback type={type} message={message} />;
}
