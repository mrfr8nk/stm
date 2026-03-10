import DashboardLayout from "@/components/DashboardLayout";
import VerifyDocuments from "@/pages/shared/VerifyDocuments";

const TeacherVerify = () => (
  <DashboardLayout role="teacher">
    <VerifyDocuments role="teacher" />
  </DashboardLayout>
);

export default TeacherVerify;
