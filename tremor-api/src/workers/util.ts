import { prisma } from "../lib/db.js";

export async function recordWorkerRun(
  worker: string,
  status: "running" | "success" | "error",
  existingId?: string,
  detail?: string,
  error?: string,
) {
  if (existingId) {
    return prisma.workerRun.update({
      where: { id: existingId },
      data: {
        status,
        finishedAt: status === "running" ? null : new Date(),
        detail: detail ?? undefined,
        error: error ?? undefined,
      },
    });
  }
  return prisma.workerRun.create({
    data: {
      worker,
      status,
      detail,
      error,
      finishedAt: status === "running" ? null : new Date(),
    },
  });
}
