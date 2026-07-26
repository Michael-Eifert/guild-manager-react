import type { ComponentProps } from "react";

import RecruitModal from "../../components/modals/RecruitModal";

type RecruitPageProps = Omit<
  ComponentProps<typeof RecruitModal>,
  "isOpen" | "onClose" | "variant"
>;

const RecruitPage = (props: RecruitPageProps) => (
  <RecruitModal {...props} isOpen onClose={undefined} variant="page" />
);

export default RecruitPage;
