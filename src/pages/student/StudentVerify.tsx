import DashboardLayout from "@/components/DashboardLayout";
import VerifyDocuments from "@/pages/shared/VerifyDocuments";

const StudentVerify = () => (
  <DashboardLayout role="student">
    <VerifyDocuments role="student" />
  </DashboardLayout>
);

export default StudentVerify;
