import { beforeEach, describe, expect, it, vi } from "vitest";

const { deleteMany, revalidatePath, redirect } = vi.hoisted(() => ({
  deleteMany: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }),
}));
vi.mock("@/lib/db", () => ({ prisma: { asset: { deleteMany } } }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));
import { deleteAsset } from "./actions";

function form(id: string) {
  const data = new FormData();
  data.set("id", id);
  return data;
}

beforeEach(() => vi.clearAllMocks());
describe("asset deletion", () => {
  it("only deletes an unused asset and refreshes the page", async () => {
    deleteMany.mockResolvedValue({ count: 1 });
    await deleteAsset(form("unused"));
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: "unused", trades: { none: {} } } });
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
    expect(redirect).not.toHaveBeenCalled();
  });
  it("shows feedback when an asset is in use or already removed", async () => {
    deleteMany.mockResolvedValue({ count: 0 });
    await expect(deleteAsset(form("used"))).rejects.toThrow("REDIRECT:/settings?notice=asset-not-deleted#assets");
  });
  it("ignores missing IDs", async () => {
    await deleteAsset(form(""));
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
