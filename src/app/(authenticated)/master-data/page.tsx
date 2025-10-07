'use client';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { PlusCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { PaperType, ItemType, User as AppUser } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, useUser, useDoc } from '@/firebase';
import { collection, doc } from 'firebase/firestore';

export default function MasterDataPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  
  const currentUserDocRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: currentUser } = useDoc<AppUser>(currentUserDocRef);

  const paperTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'paperTypes') : null, [firestore]);
  const itemTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'itemTypes') : null, [firestore]);

  const { data: paperTypes, isLoading: loadingPaper } = useCollection<PaperType>(paperTypesQuery);
  const { data: itemTypes, isLoading: loadingItems } = useCollection<ItemType>(itemTypesQuery);

  const [newPaperType, setNewPaperType] = useState<Omit<PaperType, 'id'>>({ name: '', gsm: 0, length: 0 });
  const [newItemType, setNewItemType] = useState<Omit<ItemType, 'id'>>({ name: '', shortCode: '' });

  const [isPaperModalOpen, setIsPaperModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);

  const handleAddPaperType = () => {
    if (newPaperType.name && newPaperType.gsm && newPaperType.length && firestore) {
      const paperTypesCollection = collection(firestore, 'paperTypes');
      addDocumentNonBlocking(paperTypesCollection, newPaperType);
      setNewPaperType({ name: '', gsm: 0, length: 0 });
      setIsPaperModalOpen(false);
    }
  };

  const handleAddItemType = () => {
    if (newItemType.name && newItemType.shortCode && firestore) {
      const itemTypesCollection = collection(firestore, 'itemTypes');
      addDocumentNonBlocking(itemTypesCollection, newItemType);
      setNewItemType({ name: '', shortCode: '' });
      setIsItemModalOpen(false);
    }
  };
  
  const canEdit = currentUser?.role === 'Admin' || currentUser?.role === 'Member';

  return (
    <>
      <PageHeader
        title="Master Data"
        description="Manage reference data for paper, items, and more."
      >
        {canEdit && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Dialog open={isPaperModalOpen} onOpenChange={setIsPaperModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Paper Type
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90svh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Paper Type</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="paper-name">
                      Name
                    </Label>
                    <Input
                      id="paper-name"
                      value={newPaperType.name}
                      onChange={(e) =>
                        setNewPaperType({ ...newPaperType, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paper-gsm">
                      GSM
                    </Label>
                    <Input
                      id="paper-gsm"
                      type="number"
                      value={newPaperType.gsm || ''}
                      onChange={(e) =>
                        setNewPaperType({ ...newPaperType, gsm: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paper-length">
                      Length (cm)
                    </Label>
                    <Input
                      id="paper-length"
                      type="number"
                      value={newPaperType.length || ''}
                      onChange={(e) =>
                        setNewPaperType({ ...newPaperType, length: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleAddPaperType}>Add Paper Type</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Item Type
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90svh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Item Type</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="item-name">
                      Name
                    </Label>
                    <Input
                      id="item-name"
                      value={newItemType.name}
                      onChange={(e) =>
                        setNewItemType({ ...newItemType, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="item-shortCode">
                      Short Code
                    </Label>
                    <Input
                      id="item-shortCode"
                      value={newItemType.shortCode}
                      onChange={(e) =>
                        setNewItemType({
                          ...newItemType,
                          shortCode: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleAddItemType}>Add Item Type</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </PageHeader>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Paper Types</CardTitle>
            <CardDescription>
              Define the types of paper used in production.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paper Name</TableHead>
                    <TableHead>GSM</TableHead>
                    <TableHead className="text-right">Length (cm)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPaper ? (
                    <TableRow><TableCell colSpan={3} className="text-center">Loading...</TableCell></TableRow>
                  ) : paperTypes && paperTypes.length > 0 ? (
                    paperTypes.map((paper) => (
                      <TableRow key={paper.id}>
                        <TableCell className="font-medium whitespace-nowrap">{paper.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{paper.gsm}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{paper.length}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={3} className="text-center">No paper types found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Item Types</CardTitle>
            <CardDescription>
              Define the ruling types for notebooks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">Short Code</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingItems ? (
                    <TableRow><TableCell colSpan={2} className="text-center">Loading...</TableCell></TableRow>
                  ) : itemTypes && itemTypes.length > 0 ? (
                    itemTypes.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium whitespace-nowrap">{item.name}</TableCell>
                        <TableCell className="text-right">
                          {item.shortCode}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={2} className="text-center">No item types found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
