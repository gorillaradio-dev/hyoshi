import { Head, Link, router } from '@inertiajs/react';
import { Plus, SlidersHorizontal } from 'lucide-react';
import {  useState } from 'react';
import type {ReactNode} from 'react';
import { PageHeader } from '@/components/page-header';
import RegisterMonthlyDialog from '@/components/register-monthly-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useTenant } from '@/hooks/use-tenant';
import TenantLayout from '@/layouts/tenant-layout';
import { statusLabel, statusVariant } from '@/lib/student-status';
import type { LatestEnrollment, Student, StudentFilters, StudentPaymentInfo, StudentStatus } from '@/types';

type PaymentDataResponse = {
    effectiveRate: number | null;
    balance: number;
    uncoveredPeriods: string[];
    uncoveredCount: number;
    latestEnrollment: LatestEnrollment;
    enrollmentExpired: boolean;
};

type Props = {
    students: Student[];
    filters: StudentFilters;
    statuses: StudentStatus[];
    paymentInfo: Record<string, StudentPaymentInfo>;
};

export default function StudentsIndex({ students, filters, statuses, paymentInfo }: Props) {
    const tenant = useTenant();
    const prefix = `/app/${tenant.slug}`;
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [payDialogOpen, setPayDialogOpen] = useState(false);
    const [payDialogLoading, setPayDialogLoading] = useState<string | null>(null);
    const [paymentData, setPaymentData] = useState<PaymentDataResponse | null>(null);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

    const showPayments = filters.payments;
    const isActiveFilter = !filters.status || filters.status === 'active';

    function applyFilters(updates: Partial<StudentFilters>) {
        const merged = { ...filters, ...updates };
        router.get(`${prefix}/students`, merged as Record<string, string | boolean>, {
            preserveState: true,
            replace: true,
        });
    }

    function handleSearch(value: string) {
        applyFilters({ search: value });
    }

    function handleStatusFilter(value: string) {
        applyFilters({ status: value });
    }

    function handlePaymentsToggle(checked: boolean) {
        applyFilters({ payments: checked });
    }

    async function handleQuickPay(studentId: string) {
        setPayDialogLoading(studentId);
        try {
            const response = await fetch(`${prefix}/students/${studentId}/payment-data`, {
                headers: { 'Accept': 'application/json' },
            });
            if (!response.ok) throw new Error('Failed to fetch payment data');
            const data: PaymentDataResponse = await response.json();
            setPaymentData(data);
            setSelectedStudentId(studentId);
            setPayDialogOpen(true);
        } finally {
            setPayDialogLoading(null);
        }
    }

    function renderPaymentIndicator(student: Student) {
        if (!showPayments) return null;

        const info = paymentInfo[student.id];
        if (!info) return null;

        if (!info.has_rate) {
            return (
                <span
                    className="inline-block size-2.5 rounded-full bg-muted-foreground/30"
                    title="Nessuna tariffa configurata"
                />
            );
        }

        if (info.uncovered_count > 0) {
            return (
                <Badge variant="destructive" className="min-w-6 justify-center tabular-nums">
                    {info.uncovered_count}
                </Badge>
            );
        }

        return (
            <span
                className="inline-block size-2.5 rounded-full bg-primary"
                title="In pari"
            />
        );
    }

    function renderActionCell(student: Student) {
        if (student.effective_status !== 'active') {
            return (
                <Badge variant={statusVariant[student.effective_status]}>
                    {statusLabel[student.effective_status]}
                </Badge>
            );
        }

        const isLoading = payDialogLoading === student.id;

        return (
            <Button
                size="sm"
                variant="outline"
                onClick={() => handleQuickPay(student.id)}
                disabled={isLoading}
            >
                {isLoading ? '...' : '€ Paga'}
            </Button>
        );
    }

    return (
        <>
            <Head title="Allievi" />
            <div className="flex flex-1 flex-col gap-4 p-4">
                <PageHeader
                    sticky
                    inline
                    title={<h1 className="text-xl font-semibold">Allievi</h1>}
                    actions={
                        <Button size="sm" asChild>
                            <Link href={`${prefix}/students/create`}>
                                <Plus data-icon="inline-start" />
                                Nuovo allievo
                            </Link>
                        </Button>
                    }
                >
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Cerca allievo..."
                            defaultValue={filters.search}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="min-w-0 flex-1"
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDrawerOpen(true)}
                            className="shrink-0"
                        >
                            <SlidersHorizontal data-icon="inline-start" />
                            Filtri
                        </Button>
                    </div>
                </PageHeader>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Cognome</TableHead>
                                {showPayments && isActiveFilter && (
                                    <TableHead className="w-16 text-center">Pag.</TableHead>
                                )}
                                <TableHead className="w-20 text-right" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {students.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={showPayments && isActiveFilter ? 4 : 3}
                                        className="py-8 text-center text-muted-foreground"
                                    >
                                        Nessun allievo trovato.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                students.map((student) => (
                                    <TableRow key={student.id}>
                                        <TableCell>
                                            <Link
                                                href={`${prefix}/students/${student.id}`}
                                                className="hover:underline"
                                            >
                                                {student.first_name}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Link
                                                href={`${prefix}/students/${student.id}`}
                                                className="font-medium hover:underline"
                                            >
                                                {student.last_name}
                                            </Link>
                                        </TableCell>
                                        {showPayments && isActiveFilter && (
                                            <TableCell className="text-center">
                                                {student.effective_status === 'active'
                                                    ? renderPaymentIndicator(student)
                                                    : null}
                                            </TableCell>
                                        )}
                                        <TableCell className="text-right">
                                            {renderActionCell(student)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Filters Drawer */}
            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>Filtri</DrawerTitle>
                    </DrawerHeader>
                    <div className="flex flex-col gap-4 px-4">
                        <Field>
                            <FieldLabel>Stato</FieldLabel>
                            <Select
                                value={filters.status || 'active'}
                                onValueChange={(value) => {
                                    handleStatusFilter(value);
                                    setDrawerOpen(false);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="all">Tutti</SelectItem>
                                        {statuses.map((s) => (
                                            <SelectItem key={s.value} value={s.value}>
                                                {s.label}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </Field>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="payments-toggle">Mostra pagamenti</Label>
                            <Switch
                                id="payments-toggle"
                                checked={showPayments}
                                onCheckedChange={(checked) => {
                                    handlePaymentsToggle(checked);
                                    setDrawerOpen(false);
                                }}
                            />
                        </div>
                    </div>
                    <DrawerFooter>
                        <DrawerClose asChild>
                            <Button variant="outline">Chiudi</Button>
                        </DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>

            {/* Quick-pay Monthly Dialog */}
            {selectedStudentId && paymentData && (
                <RegisterMonthlyDialog
                    open={payDialogOpen}
                    onOpenChange={(open) => {
                        setPayDialogOpen(open);
                        if (!open) {
                            setSelectedStudentId(null);
                            setPaymentData(null);
                        }
                    }}
                    studentId={selectedStudentId}
                    effectiveRate={paymentData.effectiveRate}
                    balance={paymentData.balance}
                    enrollmentExpired={paymentData.enrollmentExpired}
                    uncoveredCount={paymentData.uncoveredCount}
                />
            )}
        </>
    );
}

StudentsIndex.layout = (page: ReactNode) => (
    <TenantLayout breadcrumbs={[{ title: 'Allievi', href: '#' }]}>{page}</TenantLayout>
);
