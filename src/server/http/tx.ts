import "server-only";
import { transaction, type Tx } from "../db/client";

// Use the receipt transaction when one is open, otherwise open a dedicated transaction.
export const inTx = <T>(ctx: { tx: Tx | null }, work: (tx: Tx) => Promise<T>): Promise<T> =>
  ctx.tx ? work(ctx.tx) : transaction(work);
