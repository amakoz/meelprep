import { getPlannerDTO } from "@/data/dal";
import { PlannerApp } from "@/components/planner/PlannerApp";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ menu?: string | string[] }>;
}) {
  const params = await searchParams;
  const menuId = typeof params.menu === "string" ? params.menu : undefined;
  const initial = await getPlannerDTO(menuId);
  return <PlannerApp initial={initial} />;
}
