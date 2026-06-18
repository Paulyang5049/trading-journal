export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState, Button } from "@/components/ui";
import { ImportForm } from "@/components/import-form";
import { importTrades } from "./actions";

export default async function ImportPage() {
  const accounts = await prisma.account.findMany({ orderBy: { name: "asc" } });

  if (accounts.length === 0) {
    return (
      <div>
        <PageHeader title="Import trades" />
        <EmptyState
          title="Create an account first"
          description="You need at least one account to import trades into."
          action={
            <Link href="/settings">
              <Button>Go to setup</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Import trades"
        description="Bulk-import trades from a broker CSV export."
      />
      <ImportForm
        action={importTrades}
        accounts={accounts.map((a) => ({ id: a.id, label: a.name }))}
      />
    </div>
  );
}
