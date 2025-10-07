'use client';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { PlusCircle, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import {
  Ruling,
  RulingEntry,
  PaperType,
  ItemType,
  Program,
} from '@/lib/types';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const initialPaperTypes: PaperType[] = [
  { id: '1', name: 'Maplitho', gsm: 58, length: 91.5 },
  { id: '2', name: 'Creamwove', gsm: 60, length: 88 },
];
const initialItemTypes: ItemType[] = [
  { id: '1', name: 'Single Line', shortCode: 'SL' },
  { id: '2', name: 'Double Line', shortCode: 'DL' },
];
const initialPrograms: Program[] = [
    { id: 'p1', brand: 'Classmate', paperTypeId: '1', gsm: 58, length: 91.5, itemTypeId: '1', cutoff: 30, piecesPerBundle: 10, totalSheetsRequired: 10000, notebookPages: 120, bundlesRequired: 1, coverIndex: 2, date: new Date(), reamWeight: 8.4, ups: 2},
    { id: 'p2', brand: 'Navneet', paperTypeId: '2', gsm: 60, length: 88, itemTypeId: '2', cutoff: 35, piecesPerBundle: 8, totalSheetsRequired: 8000, notebookPages: 96, bundlesRequired: 1, coverIndex: 2, date: new Date(), reamWeight: 9.2, ups: 2 },
];


export default function RulingPage() {
  const [rulings, setRulings] = useState<Ruling[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [newRuling, setNewRuling] = useState<Partial<Ruling>>({ entries: [] });
  const [newEntry, setNewEntry] = useState<Partial<RulingEntry>>({});

  const resetForm = useCallback(() => {
    setNewRuling({ entries: [] });
    setNewEntry({});
    setCurrentStep(1);
    setIsModalOpen(false);
  }, []);

  const handleAddRulingEntry = () => {
    if (newEntry.itemTypeId && newEntry.sheetsRuled) {
       const selectedPaper = initialPaperTypes.find(p => p.id === newRuling.paperTypeId);
       const program = initialPrograms.find(p => p.id === newEntry.programId);
       
       let cutoff = newEntry.cutoff || 0;
       if (program) {
         cutoff = program.cutoff;
       }

       let reamWeight = 0;
       let theoreticalSheets = 0;

       if (selectedPaper && cutoff > 0 && newRuling.reelWeight && newRuling.reelWeight > 0) {
            reamWeight = (selectedPaper.length * cutoff * selectedPaper.gsm) / 20000;
            if(reamWeight > 0) {
                theoreticalSheets = (newRuling.reelWeight * 500) / reamWeight;
            }
       }

      const entryToAdd: RulingEntry = {
        id: `${(newRuling.entries?.length || 0) + 1}`,
        ...newEntry,
        cutoff,
        theoreticalSheets,
        difference: newEntry.sheetsRuled - theoreticalSheets
      } as RulingEntry;
      
      setNewRuling((prev) => ({
        ...prev,
        entries: [...(prev.entries || []), entryToAdd],
      }));
      setNewEntry({});
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (newRuling.serialNo && newRuling.reelNo && newRuling.paperTypeId && newRuling.reelWeight) {
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
        setCurrentStep(3);
    }
  };

  const handleSaveRuling = () => {
     const rulingToAdd: Ruling = {
      id: `${rulings.length + 1}`,
      date: new Date(),
      status: 'Partially Used',
      ...newRuling,
    } as Ruling;

    setRulings([rulingToAdd, ...rulings]);
    resetForm();
  }
  
  const getProgramInfo = (programId?: string) => {
    if (!programId) return null;
    return initialPrograms.find(p => p.id === programId);
  }

  const selectedPaper = useMemo(() => {
    return initialPaperTypes.find(p => p.id === newRuling.paperTypeId);
  }, [newRuling.paperTypeId]);


  const calculationSummary = useMemo(() => {
    if (!selectedPaper || !newRuling.reelWeight) return null;

    const totalSheetsRuled = (newRuling.entries || []).reduce((sum, entry) => sum + (entry.sheetsRuled || 0), 0);

    const firstEntry = (newRuling.entries || [])[0];
    if (!firstEntry) return { totalSheetsRuled, totalTheoreticalSheets: 0, totalDifference: 0 };

    const reamWeight = (selectedPaper.length * firstEntry.cutoff * selectedPaper.gsm) / 20000;
    const totalTheoreticalSheets = reamWeight > 0 ? (newRuling.reelWeight * 500) / reamWeight : 0;
    
    return {
      totalSheetsRuled,
      totalTheoreticalSheets,
      totalDifference: totalSheetsRuled - totalTheoreticalSheets,
    };
  }, [newRuling, selectedPaper]);


  return (
    <>
      <PageHeader
        title="Reel Ruling"
        description="Log reel ruling with or without a program, and manage multiple rulings per reel."
      >
        <Dialog open={isModalOpen} onOpenChange={(isOpen) => {
            if (!isOpen) resetForm();
            setIsModalOpen(isOpen);
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsModalOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Reel Ruling
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90svh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Add Reel Ruling</DialogTitle>
              <DialogDescription>
                Follow the steps to log a new ruling for a reel.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto pr-6">
            {/* Step 1: Reel Details */}
            {currentStep === 1 && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" value={new Date().toLocaleDateString()} readOnly disabled />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="serialNo">Serial No.</Label>
                    <Input
                      id="serialNo"
                      value={newRuling.serialNo || ''}
                      onChange={(e) => setNewRuling({ ...newRuling, serialNo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reelNo">Reel No.</Label>
                    <Input
                      id="reelNo"
                      value={newRuling.reelNo || ''}
                      onChange={(e) => setNewRuling({ ...newRuling, reelNo: e.target.value })}
                    />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="reelWeight">Reel Weight (kg)</Label>
                    <Input
                      id="reelWeight"
                      type="number"
                      value={newRuling.reelWeight || ''}
                      onChange={(e) => setNewRuling({ ...newRuling, reelWeight: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paperTypeId">Paper Type</Label>
                  <Select onValueChange={(value) => setNewRuling({ ...newRuling, paperTypeId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select paper" />
                    </SelectTrigger>
                    <SelectContent>
                      {initialPaperTypes.map((paper) => (
                        <SelectItem key={paper.id} value={paper.id}>
                          {paper.name} ({paper.gsm}gsm)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedPaper && (
                    <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-muted-foreground">
                        <p>GSM: {selectedPaper.gsm}</p>
                        <p>Length: {selectedPaper.length} cm</p>
                    </div>
                )}
              </div>
            )}

            {/* Step 2: Ruling Entries */}
            {currentStep === 2 && (
              <div className="py-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-lg">
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="programId">Program (Optional)</Label>
                        <Select onValueChange={(value) => {
                            const program = getProgramInfo(value);
                            setNewEntry({
                                ...newEntry,
                                programId: value === 'no-program' ? undefined : value,
                                itemTypeId: program?.itemTypeId,
                                cutoff: program?.cutoff,
                            })
                        }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a program" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="no-program">No Program</SelectItem>
                                {initialPrograms.map((prog) => (
                                    <SelectItem key={prog.id} value={prog.id}>{prog.brand} - {initialItemTypes.find(i => i.id === prog.itemTypeId)?.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="itemTypeId">Item Type</Label>
                        <Select
                            value={newEntry.itemTypeId || ''}
                            onValueChange={(value) => setNewEntry({...newEntry, itemTypeId: value})}
                            disabled={!!newEntry.programId}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select item"/>
                            </SelectTrigger>
                            <SelectContent>
                                {initialItemTypes.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="cutoff">Cutoff (cm)</Label>
                        <Input
                            id="cutoff"
                            type="number"
                            value={newEntry.cutoff || ''}
                            onChange={(e) => setNewEntry({...newEntry, cutoff: parseFloat(e.target.value)})}
                            disabled={!!newEntry.programId}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="sheetsRuled">Sheets Ruled</Label>
                        <Input
                            id="sheetsRuled"
                            type="number"
                            value={newEntry.sheetsRuled || ''}
                            onChange={(e) => setNewEntry({...newEntry, sheetsRuled: parseInt(e.target.value) || 0})}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <Button onClick={handleAddRulingEntry} className="w-full">Add Ruling Entry</Button>
                    </div>
                </div>

                <div className="mt-4">
                    <h4 className="font-semibold mb-2">Current Entries for this Reel</h4>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead>Sheets Ruled</TableHead>
                                <TableHead>Program</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {newRuling.entries && newRuling.entries.length > 0 ? newRuling.entries.map(entry => (
                                <TableRow key={entry.id}>
                                    <TableCell>{initialItemTypes.find(i => i.id === entry.itemTypeId)?.name}</TableCell>
                                    <TableCell>{entry.sheetsRuled.toLocaleString()}</TableCell>
                                    <TableCell>{getProgramInfo(entry.programId)?.brand || 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => setNewRuling(prev => ({...prev, entries: prev.entries?.filter(e => e.id !== entry.id)}))}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={4} className="text-center">No entries yet.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
              </div>
            )}
            
            {/* Step 3: Summary & Finish */}
            {currentStep === 3 && (
                <div className="py-4 space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Reel Summary</CardTitle></CardHeader>
                        <CardContent className="text-sm space-y-1">
                            <p><strong>Date:</strong> {new Date(newRuling.date || Date.now()).toLocaleDateString()}</p>
                            <p><strong>Serial No:</strong> {newRuling.serialNo}</p>
                            <p><strong>Reel No:</strong> {newRuling.reelNo}</p>
                            <p><strong>Paper:</strong> {initialPaperTypes.find(p => p.id === newRuling.paperTypeId)?.name}</p>
                            <p><strong>Reel Weight:</strong> {newRuling.reelWeight} kg</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle>Ruling Entries & Calculations</CardTitle></CardHeader>
                        <CardContent>
                            {newRuling.entries && newRuling.entries.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead>Ruled</TableHead>
                                            <TableHead>Theoretical</TableHead>
                                            <TableHead className="text-right">Difference</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {newRuling.entries.map(e => (
                                            <TableRow key={e.id}>
                                                <TableCell>{initialItemTypes.find(i => i.id === e.itemTypeId)?.name}</TableCell>
                                                <TableCell>{e.sheetsRuled.toLocaleString()}</TableCell>
                                                <TableCell>{Math.round(e.theoreticalSheets || 0).toLocaleString()}</TableCell>
                                                <TableCell className="text-right">
                                                     <Badge variant={e.difference && e.difference >= 0 ? 'default' : 'destructive'} className={e.difference && e.difference >= 0 ? 'bg-green-600' : ''}>
                                                        {Math.round(e.difference || 0).toLocaleString()}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ): <p className="text-sm text-muted-foreground">No ruling entries were added.</p>}

                            {calculationSummary && (
                                <div className="mt-4 pt-4 border-t">
                                  <h4 className="font-semibold">Total Summary</h4>
                                  <div className="text-sm mt-2 space-y-1">
                                    <div>Total Sheets Ruled: {calculationSummary.totalSheetsRuled.toLocaleString()}</div>
                                    <div>Total Theoretical Sheets: {Math.round(calculationSummary.totalTheoreticalSheets).toLocaleString()}</div>
                                    <div>Overall Difference: 
                                        <Badge variant={calculationSummary.totalDifference >= 0 ? 'default' : 'destructive'} className={`ml-2 ${calculationSummary.totalDifference >= 0 ? 'bg-green-600' : ''}`}>
                                            {Math.round(calculationSummary.totalDifference).toLocaleString()}
                                        </Badge>
                                    </div>
                                  </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <div className="space-y-2">
                        <Label htmlFor="status">Final Reel Status</Label>
                         <Select onValueChange={(value) => setNewRuling({...newRuling, status: value as "Partially Used" | "Finished"})}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select final status"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Partially Used">Partially Used</SelectItem>
                                <SelectItem value="Finished">Finished</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}
            </div>
            <DialogFooter className="mt-auto pt-4 border-t">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              {currentStep > 1 && (
                 <Button variant="secondary" onClick={() => setCurrentStep(currentStep - 1)}>
                    Back
                </Button>
              )}
              {currentStep < 3 && (
                <Button onClick={handleNextStep}>
                  Next
                </Button>
              )}
              {currentStep === 3 && (
                 <Button onClick={handleSaveRuling}>
                    Save Ruling
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Reel Rulings</CardTitle>
          </CardHeader>
          <CardContent>
            {rulings.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                {rulings.map(ruling => (
                    <AccordionItem value={ruling.id} key={ruling.id}>
                        <AccordionTrigger>
                            <div className="flex justify-between w-full pr-4">
                                <span className="font-semibold">Reel No: {ruling.reelNo} (SN: {ruling.serialNo})</span>
                                <Badge variant={ruling.status === 'Finished' ? 'destructive' : 'secondary'}>{ruling.status}</Badge>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                           <Table>
                             <TableHeader>
                                <TableRow>
                                    <TableHead>Item Ruled</TableHead>
                                    <TableHead>Sheets Ruled</TableHead>
                                    <TableHead>Program</TableHead>
                                    <TableHead className="text-right">Difference</TableHead>
                                </TableRow>
                             </TableHeader>
                             <TableBody>
                                {ruling.entries.map(entry => (
                                    <TableRow key={entry.id}>
                                        <TableCell>{initialItemTypes.find(i => i.id === entry.itemTypeId)?.name}</TableCell>
                                        <TableCell>{entry.sheetsRuled.toLocaleString()}</TableCell>
                                        <TableCell>{getProgramInfo(entry.programId)?.brand || 'N/A'}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={entry.difference && entry.difference >= 0 ? 'default' : 'destructive'} className={entry.difference && entry.difference >= 0 ? 'bg-green-600' : ''}>
                                                {Math.round(entry.difference || 0).toLocaleString()}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                             </TableBody>
                           </Table>
                        </AccordionContent>
                    </AccordionItem>
                ))}
              </Accordion>
            ) : (
                <div className="p-4 border-2 border-dashed border-muted-foreground/50 rounded-lg h-48 flex items-center justify-center">
                    <p className="text-muted-foreground">No reel rulings have been logged yet.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
