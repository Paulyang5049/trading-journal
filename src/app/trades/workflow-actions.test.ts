import { beforeEach, expect, it, vi } from "vitest";
const { findUnique, updateMany } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  updateMany: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ prisma: { trade: { findUnique, updateMany } } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { closePosition, completeReview } from "./workflow-actions";
const form = (data: Record<string, string>) => {
  const f = new FormData();
  Object.entries(data).forEach(([k, v]) => f.set(k, v));
  return f;
};
beforeEach(() => vi.clearAllMocks());
it("rejects exits before entry without changing the trade", async () => {
  findUnique.mockResolvedValue({
    status: "OPEN",
    entryTime: new Date("2026-10-16T12:00:00Z"),
  });
  expect(
    (
      await closePosition(
        {},
        form({ id: "t", exitPrice: "110", exitTime: "2026-10-15T12:00:00Z" }),
      )
    ).error,
  ).toContain("before");
  expect(updateMany).not.toHaveBeenCalled();
});
it("closes only open positions and resets review status", async () => {
  findUnique.mockResolvedValue({
    status: "OPEN",
    entryTime: new Date("2026-10-15"),
  });
  updateMany.mockResolvedValue({ count: 1 });
  expect(
    (
      await closePosition(
        {},
        form({
          id: "t",
          exitPrice: "110",
          exitFees: "2",
          exitTime: "2026-10-16T12:00:00Z",
        }),
      )
    ).success,
  ).toBeTruthy();
  expect(updateMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { id: "t", status: "OPEN" },
      data: expect.objectContaining({
        exitFees: 2,
        reviewedAt: null,
        status: "CLOSED",
      }),
    }),
  );
});
it("requires a lesson and valid scores to complete review", async () => {
  expect(
    (
      await completeReview(
        {},
        form({ id: "t", notes: "", confidence: "4", discipline: "4" }),
      )
    ).error,
  ).toBeTruthy();
  expect(updateMany).not.toHaveBeenCalled();
  updateMany.mockResolvedValue({ count: 1 });
  expect(
    (
      await completeReview(
        {},
        form({
          id: "t",
          notes: "Follow the plan",
          confidence: "4",
          discipline: "3",
        }),
      )
    ).success,
  ).toBeTruthy();
});
