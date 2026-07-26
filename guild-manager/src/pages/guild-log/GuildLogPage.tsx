import type { ComponentProps } from "react";

import GuildLogModal from "../../components/modals/GuildLogModal";

type GuildLogPageProps = Omit<
  ComponentProps<typeof GuildLogModal>,
  "isOpen" | "onClose" | "variant"
>;

const GuildLogPage = (props: GuildLogPageProps) => (
  <GuildLogModal {...props} isOpen variant="page" />
);

export default GuildLogPage;
