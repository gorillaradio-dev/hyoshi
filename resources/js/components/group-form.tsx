import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTenant } from '@/hooks/use-tenant';
import type { Group } from '@/types';

type GroupFormData = {
    name: string;
    description: string;
    color: string;
    monthly_fee_amount: string; // displayed/submitted in euros, backend converts to cents
};

type Props = {
    group?: Group;
    submitLabel: string;
};

export function GroupForm({ group, submitLabel }: Props) {
    const tenant = useTenant();

    const { data, setData, post, put, processing, errors } = useForm<GroupFormData>({
        name: group?.name ?? '',
        description: group?.description ?? '',
        color: group?.color ?? '#3b82f6',
        monthly_fee_amount: group ? (group.monthly_fee_amount / 100).toFixed(2) : '',
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (group) {
            put(`/app/${tenant.slug}/groups/${group.id}`);
        } else {
            post(`/app/${tenant.slug}/groups`);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Dettagli gruppo</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <Field data-invalid={!!errors.name}>
                        <FieldLabel htmlFor="name">Nome *</FieldLabel>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            aria-invalid={!!errors.name}
                            placeholder="Es. Bambini, Agonisti, Adulti..."
                        />
                        {errors.name && <FieldError>{errors.name}</FieldError>}
                    </Field>

                    <Field data-invalid={!!errors.description}>
                        <FieldLabel htmlFor="description">Descrizione</FieldLabel>
                        <Textarea
                            id="description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            aria-invalid={!!errors.description}
                            rows={3}
                            placeholder="Descrizione opzionale del gruppo..."
                        />
                        {errors.description && <FieldError>{errors.description}</FieldError>}
                    </Field>

                    <Field data-invalid={!!errors.color}>
                        <FieldLabel htmlFor="color">Colore</FieldLabel>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                id="color"
                                value={data.color}
                                onChange={(e) => setData('color', e.target.value)}
                                className="h-10 w-14 cursor-pointer rounded-md border border-input bg-transparent p-1"
                                aria-invalid={!!errors.color}
                            />
                            <Input
                                value={data.color}
                                onChange={(e) => setData('color', e.target.value)}
                                className="max-w-32 font-mono"
                                placeholder="#3b82f6"
                                aria-label="Valore esadecimale del colore"
                            />
                        </div>
                        {errors.color && <FieldError>{errors.color}</FieldError>}
                    </Field>

                    <Field data-invalid={!!errors.monthly_fee_amount}>
                        <FieldLabel htmlFor="monthly_fee_amount">Quota mensile (€) *</FieldLabel>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">€</span>
                            <Input
                                id="monthly_fee_amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={data.monthly_fee_amount}
                                onChange={(e) => setData('monthly_fee_amount', e.target.value)}
                                aria-invalid={!!errors.monthly_fee_amount}
                                placeholder="0.00"
                                className="max-w-40"
                            />
                        </div>
                        {errors.monthly_fee_amount && <FieldError>{errors.monthly_fee_amount}</FieldError>}
                    </Field>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button type="submit" disabled={processing}>
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}
