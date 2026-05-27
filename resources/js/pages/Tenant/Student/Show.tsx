import { Head, Link } from '@inertiajs/react';
import { format, parse } from 'date-fns';
import { it } from 'date-fns/locale';
import { ArrowLeft, Pencil } from 'lucide-react';
import type { ReactElement } from 'react';
import { PageHeader } from '@/components/page-header';
import StudentGroupsCard from '@/components/student-groups-card';
import StudentPaymentsTab from '@/components/student-payments-tab';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTenant } from '@/hooks/use-tenant';
import TenantLayout from '@/layouts/tenant-layout';
import { statusLabel, statusVariant } from '@/lib/student-status';
import type { Group, PaymentData, Student } from '@/types';

function formatDate(value: string | null): string | null {
    if (!value) return null;
    return format(parse(value, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: it });
}

type Props = {
    student: Student;
    availableGroups: Group[];
    paymentData: PaymentData;
};

function DisplayField({ label, value }: { label: string; value: string | null }) {
    if (!value) return null;
    return (
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1">{value}</p>
        </div>
    );
}

function computeEffectiveRate(student: Student): number | null {
    if (student.monthly_fee_override !== null) {
        return student.monthly_fee_override;
    }
    const groups = student.groups ?? [];
    if (groups.length > 0) {
        return Math.min(...groups.map((g) => g.monthly_fee_amount));
    }
    return null;
}

export default function StudentsShow({ student, availableGroups, paymentData }: Props) {
    const tenant = useTenant();
    const prefix = `/app/${tenant.slug}`;
    const effectiveRate = computeEffectiveRate(student);

    return (
        <>
            <Head title={`${student.first_name} ${student.last_name}`} />
            <div className="mx-auto w-full max-w-2xl p-4">
                <PageHeader
                    sticky
                    title={
                        <h1 className="text-2xl font-semibold">
                            {student.last_name} {student.first_name}
                        </h1>
                    }
                    actions={
                        <>
                            <Button variant="outline" onClick={() => window.history.back()}>
                                <ArrowLeft data-icon="inline-start" />
                                Indietro
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href={`${prefix}/students/${student.id}/edit`}>
                                    <Pencil data-icon="inline-start" />
                                    Modifica
                                </Link>
                            </Button>
                        </>
                    }
                />

                <Tabs defaultValue="personal">
                    <TabsList className="mb-6 w-full">
                        <TabsTrigger value="personal">Dati personali</TabsTrigger>
                        <TabsTrigger value="payments">Pagamenti</TabsTrigger>
                    </TabsList>

                    <TabsContent value="personal">
                        <div className="flex flex-col gap-6">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle>Dati personali</CardTitle>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={statusVariant[student.effective_status]}>
                                                {statusLabel[student.effective_status]}
                                            </Badge>
                                            {student.effective_status === 'pending' && (
                                                <span className="text-xs text-muted-foreground">
                                                    {paymentData.latestEnrollment
                                                        ? 'Iscrizione scaduta'
                                                        : 'Iscrizione non effettuata'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <DisplayField label="Nome" value={student.first_name} />
                                        <DisplayField label="Cognome" value={student.last_name} />
                                        <DisplayField label="Email" value={student.email} />
                                        <DisplayField
                                            label="Telefono"
                                            value={
                                                student.effective_phone
                                                    ? student.phone_contact_id
                                                        ? `${student.effective_phone} (da contatto: ${student.emergency_contacts?.find(c => c.id === student.phone_contact_id)?.name ?? '—'})`
                                                        : student.effective_phone
                                                    : null
                                            }
                                        />
                                        <DisplayField label="Data di nascita" value={formatDate(student.date_of_birth)} />
                                        <DisplayField label="Codice fiscale" value={student.fiscal_code} />
                                        <DisplayField label="Data iscrizione" value={formatDate(student.enrolled_at)} />
                                    </div>
                                </CardContent>
                            </Card>

                            <StudentGroupsCard
                                studentId={student.id}
                                groups={student.groups ?? []}
                                availableGroups={availableGroups}
                                effectiveRate={effectiveRate}
                                monthlyFeeOverride={student.monthly_fee_override}
                            />

                            {student.address && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Indirizzo</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <DisplayField label="Indirizzo" value={student.address} />
                                    </CardContent>
                                </Card>
                            )}

                            <Card>
                                <CardHeader>
                                    <CardTitle>Contatti di emergenza</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {student.emergency_contacts?.length > 0 ? (
                                        <div className="flex flex-col gap-4">
                                            {student.emergency_contacts.map((contact) => (
                                                <div key={contact.id} className="grid gap-4 sm:grid-cols-2">
                                                    <DisplayField label="Nome contatto" value={contact.name} />
                                                    <DisplayField label="Telefono contatto" value={contact.phone} />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Nessun contatto di emergenza</p>
                                    )}
                                </CardContent>
                            </Card>

                            {student.notes && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Note</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="whitespace-pre-wrap">{student.notes}</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="payments">
                        <StudentPaymentsTab studentId={student.id} paymentData={paymentData} />
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}

StudentsShow.layout = (page: ReactElement<Props>) => {
    const { student } = page.props;
    return (
        <TenantLayout breadcrumbs={[
            { title: 'Allievi', href: 'students' },
            { title: `${student.last_name} ${student.first_name}`, href: '#' },
        ]}>
            {page}
        </TenantLayout>
    );
};
