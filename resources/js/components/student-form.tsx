import { useForm } from '@inertiajs/react';
import { Phone, Plus, Trash2, Users } from 'lucide-react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTenant } from '@/hooks/use-tenant';
import type { Student } from '@/types';

type EmergencyContactFormData = {
    name: string;
    phone: string;
};

type StudentFormData = {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    date_of_birth: string;
    fiscal_code: string;
    address: string;
    emergency_contacts: EmergencyContactFormData[];
    phone_contact_index: number | null;
    notes: string;
    enrolled_at: string;
    monthly_fee_override: string;
};

type Props = {
    student?: Student;
    submitLabel: string;
    formId?: string;
};

function initPhoneContactIndex(student?: Student): number | null {
    if (!student?.phone_contact_id || !student.emergency_contacts) return null;
    const idx = student.emergency_contacts.findIndex(c => c.id === student.phone_contact_id);
    return idx >= 0 ? idx : null;
}

export function StudentForm({ student, submitLabel, formId }: Props) {
    const tenant = useTenant();

    const { data, setData, post, put, processing, errors, transform } = useForm<StudentFormData>({
        first_name: student?.first_name ?? '',
        last_name: student?.last_name ?? '',
        email: student?.email ?? '',
        phone: student?.phone ?? '',
        date_of_birth: student?.date_of_birth ?? '',
        fiscal_code: student?.fiscal_code ?? '',
        address: student?.address ?? '',
        emergency_contacts: student?.emergency_contacts?.map(c => ({ name: c.name, phone: c.phone })) ?? [],
        phone_contact_index: initPhoneContactIndex(student),
        notes: student?.notes ?? '',
        enrolled_at: student?.enrolled_at ?? new Date().toISOString().split('T')[0],
        monthly_fee_override: student?.monthly_fee_override !== null && student?.monthly_fee_override !== undefined
            ? (student.monthly_fee_override / 100).toFixed(2)
            : '',
    });

    transform((formData) => ({
        ...formData,
        emergency_contacts: formData.emergency_contacts.filter(c => c.name.trim() || c.phone.trim()),
        monthly_fee_override: formData.monthly_fee_override.trim() === '' ? null : formData.monthly_fee_override,
    }));

    function addContact() {
        setData('emergency_contacts', [...data.emergency_contacts, { name: '', phone: '' }]);
    }

    function removeContact(index: number) {
        const updated = data.emergency_contacts.filter((_, i) => i !== index);
        setData(prev => ({
            ...prev,
            emergency_contacts: updated,
            phone_contact_index:
                prev.phone_contact_index === index
                    ? null
                    : prev.phone_contact_index !== null && prev.phone_contact_index > index
                        ? prev.phone_contact_index - 1
                        : prev.phone_contact_index,
            phone: prev.phone_contact_index === index ? '' : prev.phone,
        }));
    }

    function updateContact(index: number, field: 'name' | 'phone', value: string) {
        const updated = [...data.emergency_contacts];
        updated[index] = { ...updated[index], [field]: value };
        setData('emergency_contacts', updated);
    }

    function selectPhoneContact(index: number | null) {
        setData(prev => ({
            ...prev,
            phone_contact_index: index,
            phone: index === null ? '' : '',
        }));
    }

    const linkedContact = data.phone_contact_index !== null
        ? data.emergency_contacts[data.phone_contact_index]
        : null;

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (student) {
            put(`/app/${tenant.slug}/students/${student.id}`);
        } else {
            post(`/app/${tenant.slug}/students`);
        }
    }

    return (
        <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Dati personali</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                    <Field data-invalid={!!errors.first_name}>
                        <FieldLabel htmlFor="first_name">Nome *</FieldLabel>
                        <Input
                            id="first_name"
                            value={data.first_name}
                            onChange={(e) => setData('first_name', e.target.value)}
                            aria-invalid={!!errors.first_name}
                        />
                        {errors.first_name && <FieldError>{errors.first_name}</FieldError>}
                    </Field>

                    <Field data-invalid={!!errors.last_name}>
                        <FieldLabel htmlFor="last_name">Cognome *</FieldLabel>
                        <Input
                            id="last_name"
                            value={data.last_name}
                            onChange={(e) => setData('last_name', e.target.value)}
                            aria-invalid={!!errors.last_name}
                        />
                        {errors.last_name && <FieldError>{errors.last_name}</FieldError>}
                    </Field>

                    <Field data-invalid={!!errors.email}>
                        <FieldLabel htmlFor="email">Email</FieldLabel>
                        <Input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            aria-invalid={!!errors.email}
                        />
                        {errors.email && <FieldError>{errors.email}</FieldError>}
                    </Field>

                    <Field data-invalid={!!errors.phone}>
                        <FieldLabel htmlFor="phone">Telefono</FieldLabel>
                        <div className="flex gap-2">
                            {linkedContact ? (
                                <div className="flex flex-1 items-center gap-2 rounded-md border bg-muted px-3 py-2 text-sm">
                                    <Phone className="size-4 shrink-0 text-muted-foreground" />
                                    <span className="truncate">
                                        {linkedContact.phone || '—'}{' '}
                                        <span className="text-muted-foreground">
                                            (da {linkedContact.name || 'contatto'})
                                        </span>
                                    </span>
                                </div>
                            ) : (
                                <Input
                                    id="phone"
                                    className="flex-1"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    aria-invalid={!!errors.phone}
                                />
                            )}
                            {data.emergency_contacts.length > 0 && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button type="button" variant="outline" size="icon">
                                            <Users className="size-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => selectPhoneContact(null)}>
                                            <Phone data-icon="inline-start" />
                                            Numero proprio
                                        </DropdownMenuItem>
                                        {data.emergency_contacts.map((contact, i) => (
                                            <DropdownMenuItem key={i} onClick={() => selectPhoneContact(i)}>
                                                <Users data-icon="inline-start" />
                                                {contact.name || `Contatto ${i + 1}`} — {contact.phone || '—'}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                        {errors.phone && <FieldError>{errors.phone}</FieldError>}
                    </Field>

                    <Field data-invalid={!!errors.date_of_birth}>
                        <FieldLabel htmlFor="date_of_birth">Data di nascita</FieldLabel>
                        <DatePicker
                            id="date_of_birth"
                            value={data.date_of_birth}
                            onChange={(value) => setData('date_of_birth', value)}
                            placeholder="Seleziona data di nascita"
                            aria-invalid={!!errors.date_of_birth}
                        />
                        {errors.date_of_birth && <FieldError>{errors.date_of_birth}</FieldError>}
                    </Field>

                    <Field data-invalid={!!errors.fiscal_code}>
                        <FieldLabel htmlFor="fiscal_code">Codice fiscale</FieldLabel>
                        <Input
                            id="fiscal_code"
                            value={data.fiscal_code}
                            onChange={(e) => setData('fiscal_code', e.target.value.toUpperCase())}
                            maxLength={16}
                            aria-invalid={!!errors.fiscal_code}
                        />
                        {errors.fiscal_code && <FieldError>{errors.fiscal_code}</FieldError>}
                    </Field>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Indirizzo</CardTitle>
                </CardHeader>
                <CardContent>
                    <Field data-invalid={!!errors.address}>
                        <FieldLabel htmlFor="address">Indirizzo</FieldLabel>
                        <Input
                            id="address"
                            value={data.address}
                            onChange={(e) => setData('address', e.target.value)}
                            aria-invalid={!!errors.address}
                        />
                        {errors.address && <FieldError>{errors.address}</FieldError>}
                    </Field>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Contatti di emergenza</CardTitle>
                        <Button type="button" variant="outline" size="sm" onClick={addContact}>
                            <Plus data-icon="inline-start" />
                            Aggiungi contatto
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {data.emergency_contacts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nessun contatto di emergenza aggiunto.</p>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {data.emergency_contacts.map((contact, i) => (
                                <div key={i} className="flex items-start gap-2">
                                    <div className="grid flex-1 gap-4 sm:grid-cols-2">
                                        <Field data-invalid={!!errors[`emergency_contacts.${i}.name` as keyof typeof errors]}>
                                            <FieldLabel>Nome contatto *</FieldLabel>
                                            <Input
                                                value={contact.name}
                                                onChange={(e) => updateContact(i, 'name', e.target.value)}
                                                placeholder="Nome e cognome"
                                                aria-invalid={!!errors[`emergency_contacts.${i}.name` as keyof typeof errors]}
                                            />
                                            {errors[`emergency_contacts.${i}.name` as keyof typeof errors] && (
                                                <FieldError>
                                                    {errors[`emergency_contacts.${i}.name` as keyof typeof errors]}
                                                </FieldError>
                                            )}
                                        </Field>
                                        <Field data-invalid={!!errors[`emergency_contacts.${i}.phone` as keyof typeof errors]}>
                                            <FieldLabel>Telefono contatto *</FieldLabel>
                                            <Input
                                                value={contact.phone}
                                                onChange={(e) => updateContact(i, 'phone', e.target.value)}
                                                placeholder="Numero di telefono"
                                                aria-invalid={!!errors[`emergency_contacts.${i}.phone` as keyof typeof errors]}
                                            />
                                            {errors[`emergency_contacts.${i}.phone` as keyof typeof errors] && (
                                                <FieldError>
                                                    {errors[`emergency_contacts.${i}.phone` as keyof typeof errors]}
                                                </FieldError>
                                            )}
                                        </Field>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="mt-8 shrink-0"
                                        onClick={() => removeContact(i)}
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                    {errors.emergency_contacts && (
                        <FieldError className="mt-2">{errors.emergency_contacts}</FieldError>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Iscrizione</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                    <Field data-invalid={!!errors.enrolled_at}>
                        <FieldLabel htmlFor="enrolled_at">Data iscrizione</FieldLabel>
                        <DatePicker
                            id="enrolled_at"
                            value={data.enrolled_at}
                            onChange={(value) => setData('enrolled_at', value)}
                            placeholder="Seleziona data iscrizione"
                            aria-invalid={!!errors.enrolled_at}
                        />
                        {errors.enrolled_at && <FieldError>{errors.enrolled_at}</FieldError>}
                    </Field>

                    <Field data-invalid={!!errors.monthly_fee_override}>
                        <FieldLabel htmlFor="monthly_fee_override">Tariffa personalizzata (€/mese)</FieldLabel>
                        <Input
                            id="monthly_fee_override"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Usa tariffa gruppo"
                            value={data.monthly_fee_override}
                            onChange={(e) => setData('monthly_fee_override', e.target.value)}
                            aria-invalid={!!errors.monthly_fee_override}
                        />
                        <FieldDescription>Se impostata, sovrascrive la tariffa del gruppo.</FieldDescription>
                        {errors.monthly_fee_override && <FieldError>{errors.monthly_fee_override}</FieldError>}
                    </Field>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Note</CardTitle>
                </CardHeader>
                <CardContent>
                    <Field data-invalid={!!errors.notes}>
                        <Textarea
                            id="notes"
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            rows={4}
                            placeholder="Note aggiuntive sull'allievo..."
                            aria-invalid={!!errors.notes}
                        />
                        {errors.notes && <FieldError>{errors.notes}</FieldError>}
                    </Field>
                </CardContent>
            </Card>

            {!formId && (
                <div className="flex justify-end">
                    <Button type="submit" disabled={processing}>
                        {submitLabel}
                    </Button>
                </div>
            )}
        </form>
    );
}
