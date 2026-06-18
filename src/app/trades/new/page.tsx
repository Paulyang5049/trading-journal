export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { getFormOptions } from "@/lib/trades";
import { PageHeader, EmptyState, Button } from "@/components/ui";
import { TradeForm } from "@/components/trade-form";
import { createTrade } from "../actions";

export default async function NewTradePage() {
  const options = await getFormOptions();
  const accountCount = await prisma.account.count();
  const assetCount = await prisma.asset.count();

  if (accountCount === 0 || assetCount === 0) {
    return (
      <div>
        <PageHeader title="New trade" />
        <EmptyState
          title="Set up an account and asset first"
          description="You need at least one account and one asset before logging a trade."
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
      <PageHeader title="New trade" description="Log a new position." />
      <TradeForm action={createTrade} {...options} />
    </div>
  );
}