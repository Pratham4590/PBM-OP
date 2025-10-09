'use client';

import { useFirestore } from '@/firebase';
import { Reel, Stock } from '@/lib/types';
import { collection, doc, runTransaction } from 'firebase/firestore';

export function useStock() {
  const firestore = useFirestore();

  const updateStockOnRuling = async (
    reel: Reel,
    weightUsed: number,
    reelIsFinished: boolean
  ) => {
    if (!firestore) return;

    const stockDocRef = doc(collection(firestore, 'stock'), reel.paperTypeId);

    try {
      await runTransaction(firestore, async (transaction) => {
        const stockDoc = await transaction.get(stockDocRef);

        if (!stockDoc.exists()) {
          // This case should ideally not happen if stock is managed properly
          // But as a fallback, we can create it.
          const newStockData: Partial<Stock> = {
            paperTypeId: reel.paperTypeId,
            length: reel.length,
            gsm: reel.gsm,
            totalWeight: reelIsFinished ? 0 : reel.weight - weightUsed,
            numberOfReels: reelIsFinished ? 0 : 1,
            date: new Date(),
          };
          transaction.set(stockDocRef, newStockData);
          return;
        }

        const currentStock = stockDoc.data() as Stock;
        let newTotalWeight = currentStock.totalWeight;
        let newNumberOfReels = currentStock.numberOfReels;

        if (reelIsFinished) {
          newTotalWeight -= reel.weight; // Deduct the full original weight of the finished reel
          newNumberOfReels -= 1; // Decrement the reel count
        } else {
          newTotalWeight -= weightUsed; // Deduct only the weight that was used for a partial ruling
        }

        // Ensure stock values do not go below zero
        const finalWeight = Math.max(0, newTotalWeight);
        const finalReelCount = Math.max(0, newNumberOfReels);

        transaction.update(stockDocRef, {
          totalWeight: finalWeight,
          numberOfReels: finalReelCount,
          date: new Date(),
        });
      });
    } catch (e) {
      console.error('Stock update transaction failed: ', e);
      // Optionally re-throw or handle the error to notify the user
      throw new Error(
        'Failed to update stock. Please check the data and try again.'
      );
    }
  };

  return { updateStockOnRuling };
}
