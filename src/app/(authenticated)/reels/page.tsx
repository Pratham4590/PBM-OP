
'use client';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { PlusCircle, MoreVertical, Edit, Trash2, Filter } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useMemo, useCallback } from 'react';
import { Reel, PaperType, User as AppUser } from '@/lib/types';
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
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, writeBatch, serverTimestamp, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function ReelsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const currentUserDocRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: currentUser, isLoading: isLoadingCurrentUser } = useDoc<AppUser>(currentUserDocRef);
  
  const reelsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'reels') : null, [firestore]);
  const paperTypesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'paperTypes') : null, [firestore]);

  const { data: reels, isLoading: loadingReels } = useCollection<Reel>(reelsQuery);
  const { data: paperTypes, isLoading: loadingPaperTypes } = useCollection<PaperType>(paperTypesQuery);

  const [filterPaper, setFilterPaper] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterReelNo, setFilterReelNo] = useState('');

  const canEdit = useMemo(() => currentUser?.role === 'Admin' || currentUser?.role === 'Member', [currentUser]);

  const handleDeleteReel = (id: string) => {
    if (!firestore || !canEdit) return;
    const docRef = doc(firestore, 'reels', id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Reel Deleted' });
  };
  
  const filteredReels = useMemo(() => {
    return reels?.filter(reel => {
        const paperMatch = filterPaper === 'all' || reel.paperTypeId === filterPaper;
        const statusMatch = filterStatus === 'all' || reel.status === filterStatus;
        const reelNoMatch = filterReelNo === '' || reel.reelNo.toLowerCase().includes(filterReelNo.toLowerCase());
        return paperMatch && statusMatch && reelNoMatch;
    }).sort((a, b) => {
        if (!b.createdAt || !b.createdAt.toMillis) return -1;
        if (!a.createdAt || !a.createdAt.toMillis) return 1;
        return b.createdAt.toMillis() - a.createdAt.toMillis()
    });
  }, [reels, filterPaper, filterStatus, filterReelNo]);

  const getPaperTypeName = (paperTypeId: string) => paperTypes?.find(p => p.id === paperTypeId)?.paperName || 'N/A';
  
  const statusVariant = (status: Reel['status']): "default" | "secondary" | "outline" => {
    switch (status) {
        case 'Available': return 'default';
        case 'Partially Used': return 'secondary';
        case 'Finished': return 'outline';
    }
  };
  
  const renderFilters = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Filter by Paper</Label>
           <Select value={filterPaper} onValueChange={setFilterPaper}>
              <SelectTrigger className="w-full h-11">
                  <SelectValue placeholder="Filter by paper type..." />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="all">All Paper Types</SelectItem>
                  {paperTypes?.map(p => <SelectItem key={p.id} value={p.id}>{p.paperName}</SelectItem>)}
              </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
           <Label>Filter by Status</Label>
           <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full h-11">
                    <SelectValue placeholder="Filter by status..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Partially Used">Partially Used</SelectItem>
                    <SelectItem value="Finished">Finished</SelectItem>
                </SelectContent>
            </Select>
        </div>
         <div className="space-y-2">
            <Label htmlFor='reel-no-filter'>Filter by Reel No.</Label>
            <Input id="reel-no-filter" value={filterReelNo} onChange={(e) => setFilterReelNo(e.target.value)} placeholder="Type a reel number..." className="h-11" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Reel Management"
        description="Track individual paper reels from stock."
      >
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Reel List</CardTitle>
          <CardDescription>A list of all individual reels in stock or used.</CardDescription>
            <div className="pt-4">
              {isMobile ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start"><Filter className="mr-2 h-4 w-4" /> Filters</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-screen max-w-sm p-4">
                    {renderFilters()}
                  </PopoverContent>
                </Popover>
              ) : renderFilters()}
            </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reel No.</TableHead>
                  <TableHead>Paper</TableHead>
                  <TableHead>Weight (kg)</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit && <TableHead className="w-[50px] text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingReels ? (
                  <TableRow><TableCell colSpan={canEdit ? 5 : 4} className="h-24 text-center">Loading reels...</TableCell></TableRow>
                ) : filteredReels && filteredReels.length > 0 ? (
                  filteredReels.map((reel) => (
                    <TableRow key={reel.id}>
                      <TableCell className="font-medium whitespace-nowrap">{reel.reelNo}</TableCell>
                      <TableCell className="whitespace-nowrap">{getPaperTypeName(reel.paperTypeId)}</TableCell>
                      <TableCell>{reel.weight.toFixed(2)}</TableCell>
                      <TableCell><Badge variant={statusVariant(reel.status)}>{reel.status}</Badge></TableCell>
                      {canEdit && (
                         <TableCell className="text-right">
                           <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent>
                                 <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete reel <strong>{reel.reelNo}</strong>. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteReel(reel.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                         </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={canEdit ? 5 : 4} className="h-24 text-center text-muted-foreground">No reels found for the selected filters.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
