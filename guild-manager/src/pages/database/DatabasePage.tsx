import type { ComponentProps } from "react";

import LootTableModal from "../../components/modals/LootTableModal";

type DatabasePageProps = Omit<
  ComponentProps<typeof LootTableModal>,
  "isOpen" | "onClose" | "variant"
>;

const DatabasePage = (props: DatabasePageProps) => (
  <LootTableModal {...props} isOpen onClose={undefined} variant="page" />
);

export default DatabasePage;
