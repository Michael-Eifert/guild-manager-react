import type { ComponentProps } from "react";

import ProfessionsModal from "../../components/modals/ProfessionsModal";

type ProfessionsPageProps = Omit<
  ComponentProps<typeof ProfessionsModal>,
  "isOpen" | "onClose" | "variant"
>;

const ProfessionsPage = (props: ProfessionsPageProps) => (
  <ProfessionsModal {...props} isOpen onClose={undefined} variant="page" />
);

export default ProfessionsPage;
