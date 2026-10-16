import { beforeEach, expect, it, vi } from "vitest";
const { findUnique, updateMany } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  updateMany: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  prisma: { trade: { findUnique, updateMany } },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import {
  closePosition,
  completeReview,
  removeTrade,
  restoreTrade,
} from "./workflow-actions";
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
      where: { id: "t", status: "OPEN", deletedAt: null },
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

it("rejects a missing deletion id without touching trades", async () => {
  expect((await removeTrade({}, form({}))).error).toBeTruthy();
  expect(updateMany).not.toHaveBeenCalled();
});
it("moves only the selected trade to Trash and tolerates stale repeat submissions", async () => {
  for (const count of [1, 0]) {
    updateMany.mockResolvedValueOnce({ count });
    expect((await removeTrade({}, form({ id: "t" }))).success).toBeTruthy();
  }
  expect(updateMany).toHaveBeenCalledWith({
    where: { id: "t", deletedAt: null },
    data: { deletedAt: expect.any(Date) },
  });
});
it("returns a recoverable message when deletion fails", async () => {
  updateMany.mockRejectedValueOnce(new Error("database unavailable"));
  expect((await removeTrade({}, form({ id: "t" }))).error).toContain(
    "try again",
  );
});

it("restores a selected trade without losing its linked records", async () => {
  updateMany.mockResolvedValueOnce({ count: 1 });
  expect((await restoreTrade({}, form({ id: "t" }))).success).toBeTruthy();
  expect(updateMany).toHaveBeenCalledWith({
    where: { id: "t", deletedAt: { not: null } },
    data: { deletedAt: null },
  });
});
