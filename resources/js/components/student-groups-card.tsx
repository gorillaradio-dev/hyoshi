import { router } from '@inertiajs/react';
import { X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTenant } from '@/hooks/use-tenant';
import type { Group } from '@/types';

type AssignedGroup = {
    id: string;
    name: string;
    color: string;
    monthly_fee_amount: number;
};

type Props = {
    studentId: string;
    groups: AssignedGroup[];
    availableGroups: Group[];
    effectiveRate: number | null;
    monthlyFeeOverride: number | null;
};

function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export default function StudentGroupsCard({
    studentId,
    groups,
    availableGroups,
    effectiveRate,
    monthlyFeeOverride,
}: Props) {
    const tenant = useTenant();
    const prefix = `/app/${tenant.slug}`;
    const assignedIds = new Set(groups.map((g) => g.id));
    const unassignedGroups = availableGroups.filter((g) => !assignedIds.has(g.id));

    const [selectedGroupId, setSelectedGroupId] = useState<string>('');

    function handleAdd() {
        if (!selectedGroupId) return;
        router.post(
            `${prefix}/students/${studentId}/groups`,
            { group_id: selectedGroupId },
            { preserveScroll: true, onSuccess: () => setSelectedGroupId('') },
        );
    }

    function handleDetach(groupId: string) {
        router.delete(`${prefix}/students/${studentId}/groups/${groupId}`, {
            preserveScroll: true,
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Gruppi</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                {groups.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nessun gruppo assegnato</p>
                ) : (
                    <ul className="flex flex-col gap-2">
                        {groups.map((group) => (
                            <li
                                key={group.id}
                                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                            >
                                <div className="flex min-w-0 items-center gap-2">
                                    <span
                                        className="size-3 shrink-0 rounded-full"
                                        style={{ backgroundColor: group.color }}
                                    />
                                    <span className="truncate text-sm font-medium">{group.name}</span>
                                    <span className="shrink-0 text-xs text-muted-foreground">
                                        {formatCurrency(group.monthly_fee_amount)}/mese
                                    </span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7"
                                    title="Rimuovi dal gruppo"
                                    onClick={() => handleDetach(group.id)}
                                >
                                    <X />
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}

                {unassignedGroups.length > 0 && (
                    <div className="flex gap-2">
                        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                            <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Seleziona un gruppo…" />
                            </SelectTrigger>
                            <SelectContent>
                                {unassignedGroups.map((g) => (
                                    <SelectItem key={g.id} value={g.id}>
                                        <span className="flex items-center gap-2">
                                            <span
                                                className="size-2.5 shrink-0 rounded-full"
                                                style={{ backgroundColor: g.color }}
                                            />
                                            {g.name}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            onClick={handleAdd}
                            disabled={!selectedGroupId}
                            variant="outline"
                        >
                            Aggiungi
                        </Button>
                    </div>
                )}

                <div className="border-t pt-3 text-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Tariffa effettiva</span>
                        <span className="font-medium">
                            {effectiveRate !== null ? (
                                <>
                                    {formatCurrency(effectiveRate)}/mese
                                    {monthlyFeeOverride !== null && (
                                        <span className="ml-1 text-xs text-muted-foreground">(override)</span>
                                    )}
                                    {monthlyFeeOverride === null && groups.length > 0 && (
                                        <span className="ml-1 text-xs text-muted-foreground">(minimo)</span>
                                    )}
                                </>
                            ) : (
                                <span className="text-muted-foreground">—</span>
                            )}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
