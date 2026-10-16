export const dynamic = "force-dynamic";

import Link from "next/link";
import { accountBalances } from "@/lib/account-balances";
import { prisma } from "@/lib/db";
import { getFormOptions } from "@/lib/trades";
import { PageHeader, EmptyState, Button } from "@/components/ui";
import { TradeForm } from "@/components/trade-form";
import { createTrade } from "../actions";

export default async function NewTradePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const value = (key: string) =>
    sp[key] && Number.isFinite(Number(sp[key])) ? Number(sp[key]) : undefined;
  const options = await getFormOptions();
  const balances = await accountBalances();
  const accountCount = await prisma.account.count();

  if (accountCount === 0) {
    return (
      <div>
        <PageHeader title="New trade" />
        <EmptyState
          title="Set up an account first"
          description="Create an account, then type any symbol while logging your first trade."
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
      <TradeForm
        action={createTrade}
        {...options}
        accounts={balances}
        initial={{
          accountId: options.accounts.some((a) => a.id === sp.account)
            ? sp.account
            : undefined,
          assetId: options.assets.some((a) => a.id === sp.asset)
            ? sp.asset
            : undefined,
          direction: sp.direction === "SHORT" ? "SHORT" : "LONG",
          size: value("size"),
          entryPrice: value("entry"),
          stopLoss: value("stop"),
          takeProfit: value("target"),
          leverage: value("leverage"),
        }}
      />
    </div>
  );
}
