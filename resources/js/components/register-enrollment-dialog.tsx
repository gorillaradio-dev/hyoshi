import { useForm } from '@inertiajs/react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTenant } from '@/hooks/use-tenant';
import type { LatestEnrollment } from '@/types';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    studentId: string;
    latestEnrollment: LatestEnrollment;
};

type FormData = {
    amount: string;
    notes: string;
};

function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

function centsToEuros(cents: number): string {
    return (cents / 100).toFixed(2);
}


function formatDate(dateStr: string): string {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: it });
}

function isEnrollmentActive(enrollment: LatestEnrollment): boolean {
    if (!enrollment) return false;
    return new Date(enrollment.expires_at) >= new Date();
}

export default function RegisterEnrollmentDialog({
    open,
    onOpenChange,
    studentId,
    latestEnrollment,
}: Props) {
    const tenant = useTenant();
    const prefix = `/app/${tenant.slug}`;

    const isRenewal = isEnrollmentActive(latestEnrollment);

    const { data, setData, post, processing, errors, reset } = useForm<FormData>({
        amount: latestEnrollment ? centsToEuros(latestEnrollment.expected_amount) : '',
        notes: '',
    });

    useEffect(() => {
        if (open) {
            reset();
            setData({
                amount: latestEnrollment ? centsToEuros(latestEnrollment.expected_amount) : '',
                notes: '',
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(`${prefix}/students/${studentId}/payments/enrollment`, {
            onSuccess: () => onOpenChange(false),
            preserveScroll: true,
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {isRenewal ? 'Rinnova iscrizione' : 'Registra iscrizione'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {isRenewal && latestEnrollment && (
                        <Alert>
                            <AlertTriangle />
                            <AlertDescription>
                                Rinnovo da {formatDate(latestEnrollment.starts_at)}. L'iscrizione corrente scade il{' '}
                                {formatDate(latestEnrollment.expires_at)} ({formatCurrency(latestEnrollment.expected_amount)}).
                            </AlertDescription>
                        </Alert>
                    )}

                    <Field>
                        <FieldLabel htmlFor="enrollment-amount">Importo (€)</FieldLabel>
                        <Input
                            id="enrollment-amount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={data.amount}
                            onChange={(e) => setData('amount', e.target.value)}
                            disabled={processing}
                        />
                        {errors.amount && <FieldError>{errors.amount}</FieldError>}
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="enrollment-notes">Note (opzionale)</FieldLabel>
                        <Textarea
                            id="enrollment-notes"
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            rows={3}
                            disabled={processing}
                        />
                        {errors.notes && <FieldError>{errors.notes}</FieldError>}
                    </Field>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={processing}
                        >
                            Annulla
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {isRenewal ? 'Rinnova' : 'Registra'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
