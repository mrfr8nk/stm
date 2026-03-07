import DashboardLayout from "@/components/DashboardLayout";
import MessagesPage from "@/pages/shared/MessagesPage";

const ParentMessages = () => (
  <DashboardLayout role="parent">
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold text-foreground">Messages</h1>
      <MessagesPage />
    </div>
  </DashboardLayout>
);

export default ParentMessages;
