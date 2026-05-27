import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Banknote, GraduationCap } from 'lucide-react';
import { useState } from 'react';
import RegisterEnrollmentDialog from '@/components/register-enrollment-dialog';
import RegisterMonthlyDialog from '@/components/register-monthly-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Payment, PaymentData } from '@/types';

type Props = {
    studentId: string;
    paymentData: PaymentData;
};

function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

function formatDate(dateStr: string): string {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: it });
}

function PaymentRow({ payment }: { payment: Payment }) {
    const hasMonthly = payment.monthly_fees.length > 0;
    const hasEnrollment = payment.enrollment_fees.length > 0;

    const typeLabel = (() => {
        if (hasMonthly && hasEnrollment) return 'Mensilità + Iscrizione';
        if (hasMonthly) {
            const periods = payment.monthly_fees.map((f) => f.period).join(', ');
            return `Mensilità: ${periods}`;
        }
        if (hasEnrollment) {
            const fee = payment.enrollment_fees[0];
            if (fee) {
                return `Iscrizione ${formatDate(fee.starts_at)} – ${formatDate(fee.expires_at)}`;
            }
        }
        return 'Pagamento';
    })();

    return (
        <div className="flex flex-col gap-1 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium">{typeLabel}</span>
                <span className="text-xs text-muted-foreground">{formatDate(payment.paid_at)}</span>
                {payment.notes && (
                    <span className="text-xs text-muted-foreground italic">{payment.notes}</span>
                )}
            </div>
            <span className="shrink-0 text-sm font-semibold">{formatCurrency(payment.amount)}</span>
        </div>
    );
}

export default function StudentPaymentsTab({ studentId, paymentData }: Props) {
    const [monthlyOpen, setMonthlyOpen] = useState(false);
    const [enrollmentOpen, setEnrollmentOpen] = useState(false);

    const { effectiveRate, balance, uncoveredPeriods, latestEnrollment, enrollmentExpired, payments } = paymentData;

    const balanceIsDebt = balance < 0;
    const balanceIsCredit = balance > 0;

    const enrollmentLabel = (() => {
        if (!latestEnrollment) return 'Nessuna';
        if (enrollmentExpired) return `Scaduta (${formatDate(latestEnrollment.expires_at)})`;
        return `Attiva fino al ${formatDate(latestEnrollment.expires_at)}`;
    })();

    return (
        <>
            <div className="flex flex-col gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Riepilogo pagamenti</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <p className="text-sm text-muted-foreground">Tariffa corrente</p>
                                <p className="mt-0.5 font-medium">
                                    {effectiveRate !== null ? `${formatCurrency(effectiveRate)}/mese` : '—'}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground">Saldo</p>
                                <p
                                    className={`mt-0.5 font-medium ${
                                        balanceIsDebt
                                            ? 'text-destructive'
                                            : balanceIsCredit
                                              ? 'text-green-600'
                                              : ''
                                    }`}
                                >
                                    {formatCurrency(Math.abs(balance))}
                                    {balanceIsDebt && ' (debito)'}
                                    {balanceIsCredit && ' (credito)'}
                                    {balance === 0 && ' (in pari)'}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground">Mesi scoperti</p>
                                <p className="mt-0.5 font-medium">
                                    {uncoveredPeriods.length === 0
                                        ? 'Nessuno'
                                        : `${uncoveredPeriods.length} (${uncoveredPeriods.join(', ')})`}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground">Iscrizione</p>
                                <p
                                    className={`mt-0.5 font-medium ${
                                        enrollmentExpired ? 'text-destructive' : latestEnrollment ? 'text-green-600' : ''
                                    }`}
                                >
                                    {enrollmentLabel}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setMonthlyOpen(true)}
                            >
                                <Banknote data-icon="inline-start" />
                                Registra mensilità
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setEnrollmentOpen(true)}
                            >
                                <GraduationCap data-icon="inline-start" />
                                Registra iscrizione
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Storico pagamenti</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {payments.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nessun pagamento registrato</p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {payments.map((payment) => (
                                    <PaymentRow key={payment.id} payment={payment} />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <RegisterMonthlyDialog
                open={monthlyOpen}
                onOpenChange={setMonthlyOpen}
                studentId={studentId}
                effectiveRate={effectiveRate}
                balance={balance}
                enrollmentExpired={enrollmentExpired}
                uncoveredCount={uncoveredPeriods.length}
            />

            <RegisterEnrollmentDialog
                open={enrollmentOpen}
                onOpenChange={setEnrollmentOpen}
                studentId={studentId}
                latestEnrollment={latestEnrollment}
            />
        </>
    );
}
