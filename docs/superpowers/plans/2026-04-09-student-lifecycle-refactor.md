# Student Lifecycle Refactor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static `status` column with a computed lifecycle: `pending` (no valid enrollment), `active` (valid enrollment), `suspended` (manual DB flag), `archived` (soft delete).

**Architecture:** The DB `status` column becomes nullable — only stores `suspended` when manually set, otherwise `null`. A new `effective_status` accessor on the Student model computes the real status by checking: (1) if DB status is `suspended` → suspended, (2) if student has a valid enrollment → active, (3) otherwise → pending. The `EnrollmentFeeService` already has `isEnrollmentExpired()` and `getLatestEnrollment()` — we add `hasValidEnrollment()` to consolidate logic. Frontend status maps and filters update to match the new states.

**Tech Stack:** Laravel 12, PHP 8.3, React 19, TypeScript, Inertia.js 2, Pest

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `app/Enums/StudentStatus.php` | Redefine enum: `Pending`, `Active`, `Suspended` (display-only, not all stored in DB) |
| Modify | `app/Models/Student.php` | Add `effectiveStatus` accessor, append it, remove `status` from fillable |
| Modify | `app/Services/EnrollmentFeeService.php` | Add `hasValidEnrollment()` method |
| Create | `database/migrations/2026_04_09_000001_make_student_status_nullable.php` | Make `status` nullable, default `null`, migrate existing data |
| Modify | `app/Http/Controllers/Tenant/StudentController.php` | Remove `archive()`, `reactivate()`, update `index()` filtering, `store()` no status |
| Modify | `app/Http/Controllers/Tenant/StudentPaymentController.php` | No changes needed — enrollment payment already handled, status is computed |
| Modify | `app/Http/Requests/Tenant/StoreStudentRequest.php` | Remove `status` validation rule |
| Modify | `app/Http/Requests/Tenant/UpdateStudentRequest.php` | Remove `status` validation rule |
| Modify | `app/Policies/StudentPolicy.php` | No changes needed |
| Modify | `database/factories/StudentFactory.php` | Update default status to `null`, update state methods |
| Modify | `routes/tenant.php` | Remove `archive` and `reactivate` routes |
| Modify | `resources/js/types/student.ts` | Update `Student.status` type |
| Modify | `resources/js/lib/student-status.ts` | Update status maps: pending, active, suspended |
| Modify | `resources/js/components/student-form.tsx` | Remove status dropdown from form |
| Modify | `resources/js/pages/Tenant/Student/Index.tsx` | Update filters and rendering for new statuses |
| Modify | `resources/js/pages/Tenant/Student/Show.tsx` | Use `effective_status` for badge |
| Modify | `resources/js/pages/Tenant/Student/Edit.tsx` | Update danger zone: remove archive (use delete), remove reactivate, keep suspend |
| Modify | `tests/Feature/Tenant/StudentControllerTest.php` | Update all status-related tests |
| Create | `tests/Feature/Tenant/StudentLifecycleTest.php` | New tests for computed status lifecycle |

---

### Task 1: Migration — Make status nullable

**Files:**
- Create: `database/migrations/2026_04_09_000001_make_student_status_nullable.php`

- [ ] **Step 1: Create the migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Convert existing 'active' and 'inactive' to null (computed states)
        DB::table('students')
            ->whereIn('status', ['active', 'inactive'])
            ->whereNull('deleted_at')
            ->update(['status' => null]);

        // Soft-delete all 'inactive' students (they were "archived")
        DB::table('students')
            ->where('status', 'inactive')
            ->whereNull('deleted_at')
            ->update(['deleted_at' => now()]);

        // Make column nullable with null default
        Schema::table('students', function (Blueprint $table) {
            $table->string('status')->nullable()->default(null)->change();
        });
    }

    public function down(): void
    {
        // Restore non-suspended to 'active'
        DB::table('students')
            ->whereNull('status')
            ->update(['status' => 'active']);

        Schema::table('students', function (Blueprint $table) {
            $table->string('status')->default('active')->change();
        });
    }
};
```

- [ ] **Step 2: Run migration**

Run: `php artisan migrate`
Expected: Migration completes. Existing `active` students now have `null` status, `suspended` students keep `suspended`, `inactive` students are soft-deleted with `null` status.

- [ ] **Step 3: Commit**

```bash
git add database/migrations/2026_04_09_000001_make_student_status_nullable.php
git commit -m "refactor: make student status nullable for computed lifecycle"
```

---

### Task 2: Backend — Update enum, model, and service

**Files:**
- Modify: `app/Enums/StudentStatus.php`
- Modify: `app/Models/Student.php`
- Modify: `app/Services/EnrollmentFeeService.php`

- [ ] **Step 1: Write failing test for `hasValidEnrollment`**

Create file `tests/Feature/Tenant/StudentLifecycleTest.php`:

```php
<?php

use App\Models\EnrollmentFee;
use App\Models\Payment;
use App\Models\Student;
use App\Models\Tenant;
use App\Models\User;
use App\Services\EnrollmentFeeService;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->tenant = Tenant::factory()->create(['owner_id' => $this->user->id]);
    $this->user->update(['current_tenant_id' => $this->tenant->id]);
    $this->actingAs($this->user);
    tenancy()->initialize($this->tenant);
});

afterEach(function () {
    tenancy()->end();
});

test('hasValidEnrollment returns false when student has no enrollment', function () {
    $student = Student::factory()->create();
    $service = app(EnrollmentFeeService::class);

    expect($service->hasValidEnrollment($student))->toBeFalse();
});

test('hasValidEnrollment returns true when student has active enrollment', function () {
    $student = Student::factory()->create();
    $payment = Payment::factory()->create(['student_id' => $student->id]);
    EnrollmentFee::factory()->create([
        'student_id' => $student->id,
        'payment_id' => $payment->id,
        'starts_at' => now()->subMonth(),
        'expires_at' => now()->addMonths(11),
    ]);
    $service = app(EnrollmentFeeService::class);

    expect($service->hasValidEnrollment($student))->toBeTrue();
});

test('hasValidEnrollment returns false when enrollment is expired', function () {
    $student = Student::factory()->create();
    $payment = Payment::factory()->create(['student_id' => $student->id]);
    EnrollmentFee::factory()->create([
        'student_id' => $student->id,
        'payment_id' => $payment->id,
        'starts_at' => now()->subYear()->subMonth(),
        'expires_at' => now()->subMonth(),
    ]);
    $service = app(EnrollmentFeeService::class);

    expect($service->hasValidEnrollment($student))->toBeFalse();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test tests/Feature/Tenant/StudentLifecycleTest.php`
Expected: FAIL — `hasValidEnrollment` method does not exist.

- [ ] **Step 3: Add `hasValidEnrollment` to EnrollmentFeeService**

In `app/Services/EnrollmentFeeService.php`, add after `isEnrollmentExpired`:

```php
/**
 * Check if a student has a currently valid enrollment.
 */
public function hasValidEnrollment(Student $student): bool
{
    $latest = $this->getLatestEnrollment($student);

    if ($latest === null) {
        return false;
    }

    return $latest->expires_at->isFuture();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test tests/Feature/Tenant/StudentLifecycleTest.php`
Expected: PASS (3 tests)

- [ ] **Step 5: Update the StudentStatus enum**

Replace `app/Enums/StudentStatus.php` entirely:

```php
<?php

namespace App\Enums;

enum StudentStatus: string
{
    case Pending = 'pending';
    case Active = 'active';
    case Suspended = 'suspended';
}
```

Note: `Pending` and `Active` are never stored in DB — they exist for type-safety and label mapping. Only `Suspended` is written to the `status` column.

- [ ] **Step 6: Update the Student model**

In `app/Models/Student.php`:

1. Remove `'status'` from `$fillable` array
2. Remove `'status' => StudentStatus::class` from `$casts`
3. Add `'effective_status'` to `$appends`
4. Add the `effectiveStatus` accessor:

```php
use App\Services\EnrollmentFeeService;

protected function effectiveStatus(): Attribute
{
    return Attribute::get(function (): string {
        if ($this->status === 'suspended') {
            return StudentStatus::Suspended->value;
        }

        $enrollmentService = app(EnrollmentFeeService::class);
        if ($enrollmentService->hasValidEnrollment($this)) {
            return StudentStatus::Active->value;
        }

        return StudentStatus::Pending->value;
    });
}
```

Update `$appends`:
```php
protected $appends = ['effective_phone', 'effective_status'];
```

- [ ] **Step 7: Write tests for effective_status computation**

Add to `tests/Feature/Tenant/StudentLifecycleTest.php`:

```php
test('new student without enrollment has effective_status pending', function () {
    $student = Student::factory()->create();

    expect($student->effective_status)->toBe('pending');
});

test('student with valid enrollment has effective_status active', function () {
    $student = Student::factory()->create();
    $payment = Payment::factory()->create(['student_id' => $student->id]);
    EnrollmentFee::factory()->create([
        'student_id' => $student->id,
        'payment_id' => $payment->id,
        'starts_at' => now()->subMonth(),
        'expires_at' => now()->addMonths(11),
    ]);

    // Refresh to clear any cached state
    $student->refresh();
    expect($student->effective_status)->toBe('active');
});

test('student with expired enrollment has effective_status pending', function () {
    $student = Student::factory()->create();
    $payment = Payment::factory()->create(['student_id' => $student->id]);
    EnrollmentFee::factory()->create([
        'student_id' => $student->id,
        'payment_id' => $payment->id,
        'starts_at' => now()->subYear()->subMonth(),
        'expires_at' => now()->subMonth(),
    ]);

    $student->refresh();
    expect($student->effective_status)->toBe('pending');
});

test('suspended student has effective_status suspended regardless of enrollment', function () {
    $student = Student::factory()->create();
    $student->update(['status' => 'suspended']);
    $payment = Payment::factory()->create(['student_id' => $student->id]);
    EnrollmentFee::factory()->create([
        'student_id' => $student->id,
        'payment_id' => $payment->id,
        'starts_at' => now()->subMonth(),
        'expires_at' => now()->addMonths(11),
    ]);

    $student->refresh();
    expect($student->effective_status)->toBe('suspended');
});
```

- [ ] **Step 8: Run all lifecycle tests**

Run: `php artisan test tests/Feature/Tenant/StudentLifecycleTest.php`
Expected: PASS (7 tests)

- [ ] **Step 9: Commit**

```bash
git add app/Enums/StudentStatus.php app/Models/Student.php app/Services/EnrollmentFeeService.php tests/Feature/Tenant/StudentLifecycleTest.php
git commit -m "refactor: computed effective_status for student lifecycle"
```

---

### Task 3: Backend — Update controller and requests

**Files:**
- Modify: `app/Http/Controllers/Tenant/StudentController.php`
- Modify: `app/Http/Requests/Tenant/StoreStudentRequest.php`
- Modify: `app/Http/Requests/Tenant/UpdateStudentRequest.php`
- Modify: `database/factories/StudentFactory.php`
- Modify: `routes/tenant.php`

- [ ] **Step 1: Write tests for new controller behavior**

Add to `tests/Feature/Tenant/StudentLifecycleTest.php`:

```php
test('store creates student with null status (pending)', function () {
    $response = $this->post("/app/{$this->tenant->slug}/students", [
        'first_name' => 'Marco',
        'last_name' => 'Rossi',
    ]);

    $response->assertRedirect();
    $student = Student::where('first_name', 'Marco')->first();
    expect($student->status)->toBeNull();
    expect($student->effective_status)->toBe('pending');
});

test('suspend sets status to suspended', function () {
    $student = Student::factory()->create();

    $response = $this->put("/app/{$this->tenant->slug}/students/{$student->id}/suspend");

    $response->assertRedirect();
    $student->refresh();
    expect($student->status)->toBe('suspended');
    expect($student->effective_status)->toBe('suspended');
});

test('reactivate clears suspended status', function () {
    $student = Student::factory()->create();
    $student->update(['status' => 'suspended']);

    $response = $this->put("/app/{$this->tenant->slug}/students/{$student->id}/reactivate");

    $response->assertRedirect();
    $student->refresh();
    expect($student->status)->toBeNull();
});

test('destroy soft-deletes the student', function () {
    $student = Student::factory()->create();

    $response = $this->delete("/app/{$this->tenant->slug}/students/{$student->id}");

    $response->assertRedirect();
    $this->assertSoftDeleted('students', ['id' => $student->id]);
});

test('index filters by effective_status', function () {
    // Student without enrollment = pending
    $pending = Student::factory()->create();

    // Student with valid enrollment = active
    $active = Student::factory()->create();
    $payment = Payment::factory()->create(['student_id' => $active->id]);
    EnrollmentFee::factory()->create([
        'student_id' => $active->id,
        'payment_id' => $payment->id,
        'starts_at' => now()->subMonth(),
        'expires_at' => now()->addMonths(11),
    ]);

    // Student suspended
    $suspended = Student::factory()->create();
    $suspended->update(['status' => 'suspended']);

    // Filter active — should return only active
    $response = $this->get("/app/{$this->tenant->slug}/students?status=active");
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('students', 1)
        ->where('students.0.id', $active->id)
    );

    // Filter pending — should return only pending
    $response = $this->get("/app/{$this->tenant->slug}/students?status=pending");
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('students', 1)
        ->where('students.0.id', $pending->id)
    );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test tests/Feature/Tenant/StudentLifecycleTest.php --filter="store creates|suspend sets|reactivate clears|destroy soft|index filters"`
Expected: FAIL — controller still uses old logic.

- [ ] **Step 3: Update factory**

Replace `database/factories/StudentFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Student> */
class StudentFactory extends Factory
{
    protected $model = Student::class;

    public function definition(): array
    {
        return [
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'date_of_birth' => fake()->date(),
            'fiscal_code' => strtoupper(fake()->bothify('??????##?##?###?')),
            'address' => fake()->address(),
            'notes' => null,
            'status' => null,
            'enrolled_at' => now(),
            'monthly_fee_override' => null,
            'current_cycle_started_at' => null,
            'past_cycles' => null,
        ];
    }

    public function suspended(): static
    {
        return $this->state(['status' => 'suspended']);
    }
}
```

- [ ] **Step 4: Remove status from request validation**

In `app/Http/Requests/Tenant/StoreStudentRequest.php`, remove line:
```php
'status' => ['sometimes', Rule::enum(StudentStatus::class)],
```
Also remove the `use App\Enums\StudentStatus;` import and `use Illuminate\Validation\Rule;` if no longer needed (check if `Rule` is still used for email unique).

In `app/Http/Requests/Tenant/UpdateStudentRequest.php`, remove the same line. Keep `Rule` import as it's used for email uniqueness.

- [ ] **Step 5: Update StudentController**

Key changes to `app/Http/Controllers/Tenant/StudentController.php`:

1. **Remove `statusOptions()` method** — no longer needed.

2. **Update `index()`** — filter by effective status instead of DB column:

```php
public function index(Request $request)
{
    $this->authorize('viewAny', Student::class);

    $query = Student::with('phoneContact');

    if ($search = $request->input('search')) {
        $query->where(function ($q) use ($search) {
            $q->where('first_name', 'like', "%{$search}%")
              ->orWhere('last_name', 'like', "%{$search}%")
              ->orWhere('email', 'like', "%{$search}%");
        });
    }

    $status = $request->input('status', 'active');

    // Filter by effective status
    if ($status && $status !== 'all') {
        if ($status === 'suspended') {
            $query->where('status', 'suspended');
        } elseif ($status === 'active') {
            $query->whereNull('status')
                ->whereHas('enrollmentFees', function ($q) {
                    $q->where('expires_at', '>', now());
                });
        } elseif ($status === 'pending') {
            $query->whereNull('status')
                ->whereDoesntHave('enrollmentFees', function ($q) {
                    $q->where('expires_at', '>', now());
                });
        }
    } else {
        // 'all' — exclude only suspended by default? No, show all
        // Actually 'all' means all non-deleted
    }

    $sortField = $request->input('sort', 'last_name');
    $sortDirection = $request->input('direction', 'asc');
    $allowedSorts = ['first_name', 'last_name', 'email', 'enrolled_at', 'created_at'];

    if (in_array($sortField, $allowedSorts)) {
        $query->orderBy($sortField, $sortDirection === 'desc' ? 'desc' : 'asc');
    }

    $students = $query->get();

    $paymentInfo = [];
    if ($request->boolean('payments')) {
        $students->load('groups');
        $feeCalculation = app(FeeCalculationService::class);
        $monthlyFeeService = app(MonthlyFeeService::class);

        $uncoveredCounts = $monthlyFeeService->getUncoveredCountsBatch($students);

        foreach ($students as $student) {
            $paymentInfo[$student->id] = [
                'uncovered_count' => $uncoveredCounts[$student->id] ?? 0,
                'has_rate' => $feeCalculation->getEffectiveRate($student) !== null,
            ];
        }
    }

    return Inertia::render('Tenant/Student/Index', [
        'students' => $students,
        'filters' => [
            'search' => $request->input('search', ''),
            'status' => $status,
            'sort' => $sortField,
            'direction' => $sortDirection,
            'payments' => $request->boolean('payments'),
        ],
        'statuses' => array_map(
            fn (StudentStatus $s) => ['value' => $s->value, 'label' => match ($s) {
                StudentStatus::Pending => 'In attesa',
                StudentStatus::Active => 'Attivo',
                StudentStatus::Suspended => 'Sospeso',
            }],
            StudentStatus::cases()
        ),
        'paymentInfo' => $paymentInfo,
    ]);
}
```

3. **Update `create()`** — remove statuses prop:

```php
public function create()
{
    $this->authorize('create', Student::class);

    return Inertia::render('Tenant/Student/Create');
}
```

4. **Update `edit()`** — remove statuses prop:

```php
public function edit(Student $student)
{
    $this->authorize('update', $student);

    $student->load('emergencyContacts', 'phoneContact');

    return Inertia::render('Tenant/Student/Edit', [
        'student' => $student,
    ]);
}
```

5. **Update `suspend()`** — use raw string instead of enum for DB:

```php
public function suspend(Student $student)
{
    $this->authorize('update', $student);

    $updates = ['status' => 'suspended'];

    if ($student->current_cycle_started_at) {
        $pastCycles = $student->past_cycles ?? [];
        $pastCycles[] = [
            'started_at' => $student->current_cycle_started_at->toDateString(),
            'ended_at' => now()->toDateString(),
            'reason' => 'suspended',
        ];
        $updates['current_cycle_started_at'] = null;
        $updates['past_cycles'] = $pastCycles;
    }

    $student->update($updates);

    return redirect()->route('tenant.students.show', [tenant('slug'), $student])
        ->with('success', 'Allievo sospeso.');
}
```

6. **Update `reactivate()`** — set status to null instead of Active:

```php
public function reactivate(Student $student)
{
    $this->authorize('update', $student);

    $student->update(['status' => null]);

    return redirect()->route('tenant.students.show', [tenant('slug'), $student])
        ->with('success', 'Allievo riattivato.');
}
```

7. **Remove `archive()` method** — soft delete via `destroy()` covers this.

8. **Update `search()`** — search non-suspended students with valid enrollment:

```php
public function search(Request $request)
{
    $this->authorize('viewAny', Student::class);

    $query = Student::whereNull('status')
        ->whereHas('enrollmentFees', function ($q) {
            $q->where('expires_at', '>', now());
        })
        ->select('id', 'first_name', 'last_name');

    if ($search = $request->input('q')) {
        $query->where(function ($q) use ($search) {
            $q->where('first_name', 'like', "%{$search}%")
              ->orWhere('last_name', 'like', "%{$search}%");
        });
    }

    if ($excludeGroup = $request->input('exclude_group')) {
        $query->whereDoesntHave('groups', function ($q) use ($excludeGroup) {
            $q->where('groups.id', $excludeGroup);
        });
    }

    return response()->json(
        $query->orderBy('last_name')->orderBy('first_name')->limit(10)->get()
    );
}
```

- [ ] **Step 6: Update routes**

In `routes/tenant.php`, remove the `archive` route:

```php
// Remove this line:
Route::put('students/{student}/archive', [StudentController::class, 'archive'])
    ->name('tenant.students.archive');
```

Keep `suspend` and `reactivate`.

- [ ] **Step 7: Run lifecycle tests**

Run: `php artisan test tests/Feature/Tenant/StudentLifecycleTest.php`
Expected: PASS (all tests)

- [ ] **Step 8: Commit**

```bash
git add app/Http/Controllers/Tenant/StudentController.php app/Http/Requests/Tenant/StoreStudentRequest.php app/Http/Requests/Tenant/UpdateStudentRequest.php database/factories/StudentFactory.php routes/tenant.php
git commit -m "refactor: update controller and routes for computed student lifecycle"
```

---

### Task 4: Frontend — Update types and status utilities

**Files:**
- Modify: `resources/js/types/student.ts`
- Modify: `resources/js/lib/student-status.ts`

- [ ] **Step 1: Update TypeScript types**

In `resources/js/types/student.ts`, update the `Student` type:

```typescript
export type Student = {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    date_of_birth: string | null;
    fiscal_code: string | null;
    address: string | null;
    emergency_contacts: EmergencyContact[];
    phone_contact_id: string | null;
    effective_phone: string | null;
    groups?: Array<{
        id: string;
        name: string;
        color: string;
        monthly_fee_amount: number;
    }>;
    monthly_fee_override: number | null;
    notes: string | null;
    status: 'suspended' | null;
    effective_status: 'pending' | 'active' | 'suspended';
    enrolled_at: string | null;
    created_at: string;
    updated_at: string;
};
```

Remove the `StudentStatus` type (no longer needed — statuses come as props array):
```typescript
// Remove:
// export type StudentStatus = {
//     value: string;
//     label: string;
// };
```

Wait — `StudentStatus` type is still used by `Index.tsx` for the filter dropdown props. Keep it but check if we still pass it. Yes, we still pass `statuses` from the controller. Keep the type.

- [ ] **Step 2: Update status utility**

Replace `resources/js/lib/student-status.ts`:

```typescript
export const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'outline',
    active: 'default',
    suspended: 'destructive',
};

export const statusLabel: Record<string, string> = {
    pending: 'In attesa',
    active: 'Attivo',
    suspended: 'Sospeso',
};
```

- [ ] **Step 3: Commit**

```bash
git add resources/js/types/student.ts resources/js/lib/student-status.ts
git commit -m "refactor: update frontend types and status utils for student lifecycle"
```

---

### Task 5: Frontend — Update pages

**Files:**
- Modify: `resources/js/components/student-form.tsx`
- Modify: `resources/js/pages/Tenant/Student/Index.tsx`
- Modify: `resources/js/pages/Tenant/Student/Show.tsx`
- Modify: `resources/js/pages/Tenant/Student/Edit.tsx`
- Modify: `resources/js/pages/Tenant/Student/Create.tsx`

- [ ] **Step 1: Update student-form — remove status dropdown**

In `resources/js/components/student-form.tsx`:

1. Remove `StudentStatus` from the type import
2. Remove `statuses` from Props type
3. Remove `status` from `StudentFormData` type and `useForm` initial data
4. Remove the status `<Field>` block (lines ~330-347)
5. Remove `statuses` from the component parameter destructuring

The form no longer manages status — it's computed automatically.

- [ ] **Step 2: Update Create page**

In `resources/js/pages/Tenant/Student/Create.tsx`, remove `statuses` from props if passed. The page should no longer receive or pass `statuses` to `StudentForm`.

- [ ] **Step 3: Update Edit page**

In `resources/js/pages/Tenant/Student/Edit.tsx`:

1. Remove `StudentStatus` from type imports
2. Remove `statuses` from Props type and destructuring
3. Remove `statuses` prop from `<StudentForm>`
4. Update danger zone — use `effective_status` instead of `status`:

```tsx
{student.effective_status !== 'suspended' && (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
            <p className="font-medium">Sospendi allievo</p>
            <p className="text-sm text-muted-foreground">
                L'allievo non potrà partecipare alle attività fino alla riattivazione.
            </p>
        </div>
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline">
                    <Pause data-icon="inline-start" />
                    Sospendi
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Sospendere questo allievo?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {student.first_name} {student.last_name} verrà sospeso.
                        Potrai riattivarlo in qualsiasi momento.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => router.put(`${prefix}/students/${student.id}/suspend`)}
                    >
                        Sospendi
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
)}

{student.effective_status === 'suspended' && (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
            <p className="font-medium">Riattiva allievo</p>
            <p className="text-sm text-muted-foreground">
                L'allievo tornerà al suo stato normale (in attesa o attivo in base all'iscrizione).
            </p>
        </div>
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline">
                    <Play data-icon="inline-start" />
                    Riattiva
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Riattivare questo allievo?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {student.first_name} {student.last_name} verrà riattivato.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => router.put(`${prefix}/students/${student.id}/reactivate`)}
                    >
                        Riattiva
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
)}
```

Remove the "Archivia" section entirely — the existing "Elimina" (destroy/soft-delete) handles archival.

- [ ] **Step 4: Update Index page**

In `resources/js/pages/Tenant/Student/Index.tsx`:

1. Update `renderActionCell` to use `effective_status`:

```tsx
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
```

2. Update payment indicator condition to use `effective_status`:

```tsx
{showPayments && isActiveFilter && (
    <TableCell className="text-center">
        {student.effective_status === 'active'
            ? renderPaymentIndicator(student)
            : null}
    </TableCell>
)}
```

3. Update `isActiveFilter` logic — keep as is, it checks `filters.status === 'active'`.

- [ ] **Step 5: Update Show page**

In `resources/js/pages/Tenant/Student/Show.tsx`, update the status badge:

```tsx
<Badge variant={statusVariant[student.effective_status]}>
    {statusLabel[student.effective_status]}
</Badge>
```

Also add enrollment context near the badge: if status is `pending`, show whether it's "Iscrizione non effettuata" or "Iscrizione scaduta". The data is already available in `paymentData.latestEnrollment`:

```tsx
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
```

- [ ] **Step 6: Commit**

```bash
git add resources/js/components/student-form.tsx resources/js/pages/Tenant/Student/Create.tsx resources/js/pages/Tenant/Student/Edit.tsx resources/js/pages/Tenant/Student/Index.tsx resources/js/pages/Tenant/Student/Show.tsx
git commit -m "refactor: update frontend pages for computed student lifecycle"
```

---

### Task 6: Update existing tests

**Files:**
- Modify: `tests/Feature/Tenant/StudentControllerTest.php`
- Modify: `tests/Feature/Tenant/StudentSearchTest.php`
- Modify: `tests/Feature/Tenant/StudentPaymentDataTest.php`

- [ ] **Step 1: Update StudentControllerTest**

Key changes:
1. Remove `'status' => 'active'` from all `store` test payloads (status is no longer accepted)
2. Update `'index filtra per stato'` test — now needs enrollment data to make students "active"
3. Update suspend/reactivate tests — reactivate sets `status` to `null`, not `Active`
4. Remove archive-related assertions if any
5. Update factory usage — no more `->inactive()` state, use `->suspended()` or just default

For each test that creates "active" students and filters by `status=active`, the student now needs a valid enrollment to appear as active.

- [ ] **Step 2: Update StudentSearchTest**

The `search()` endpoint now filters by `whereNull('status')` + valid enrollment. Tests need students with enrollment data to be found.

- [ ] **Step 3: Update StudentPaymentDataTest**

If tests reference `StudentStatus::Active` or filter by status, update accordingly.

- [ ] **Step 4: Run full test suite**

Run: `php artisan test tests/Feature/Tenant/`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add tests/Feature/Tenant/StudentControllerTest.php tests/Feature/Tenant/StudentSearchTest.php tests/Feature/Tenant/StudentPaymentDataTest.php
git commit -m "test: update existing tests for computed student lifecycle"
```

---

### Task 7: Additional lifecycle tests

**Files:**
- Modify: `tests/Feature/Tenant/StudentLifecycleTest.php`

- [ ] **Step 1: Add authorization and edge case tests**

Add to `tests/Feature/Tenant/StudentLifecycleTest.php`:

```php
test('enrollment payment transitions student from pending to active', function () {
    $student = Student::factory()->create();
    expect($student->effective_status)->toBe('pending');

    $service = app(EnrollmentFeeService::class);
    $service->registerEnrollment($student, 5000);

    $student->refresh();
    expect($student->effective_status)->toBe('active');
});

test('suspended student stays suspended even after enrollment payment', function () {
    $student = Student::factory()->create();
    $student->update(['status' => 'suspended']);

    $service = app(EnrollmentFeeService::class);
    $service->registerEnrollment($student, 5000);

    $student->refresh();
    expect($student->effective_status)->toBe('suspended');
});

test('reactivating suspended student with valid enrollment shows active', function () {
    $student = Student::factory()->create();
    $student->update(['status' => 'suspended']);

    $service = app(EnrollmentFeeService::class);
    $service->registerEnrollment($student, 5000);

    $this->put("/app/{$this->tenant->slug}/students/{$student->id}/reactivate");

    $student->refresh();
    expect($student->effective_status)->toBe('active');
});

test('reactivating suspended student without enrollment shows pending', function () {
    $student = Student::factory()->create();
    $student->update(['status' => 'suspended']);

    $this->put("/app/{$this->tenant->slug}/students/{$student->id}/reactivate");

    $student->refresh();
    expect($student->effective_status)->toBe('pending');
});

test('soft-deleted student is not visible in index', function () {
    $student = Student::factory()->create();
    $student->delete();

    $response = $this->get("/app/{$this->tenant->slug}/students?status=all");

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('students', 0)
    );
});

test('tenant isolation: tenant A cannot see tenant B students', function () {
    Student::factory()->create();

    $otherUser = User::factory()->create();
    $otherTenant = Tenant::factory()->create(['owner_id' => $otherUser->id]);

    $response = $this->get("/app/{$otherTenant->slug}/students");

    $response->assertForbidden();
});

test('store does not accept status field', function () {
    $response = $this->post("/app/{$this->tenant->slug}/students", [
        'first_name' => 'Marco',
        'last_name' => 'Rossi',
        'status' => 'active',
    ]);

    $response->assertRedirect();
    $student = Student::where('first_name', 'Marco')->first();
    // Status should be null regardless of what was sent
    expect($student->status)->toBeNull();
});
```

- [ ] **Step 2: Run all tests**

Run: `php artisan test tests/Feature/Tenant/`
Expected: PASS (all tests)

- [ ] **Step 3: Commit**

```bash
git add tests/Feature/Tenant/StudentLifecycleTest.php
git commit -m "test: add comprehensive lifecycle transition tests"
```

---

### Task 8: Check for Payment and EnrollmentFee factories

**Files:**
- Check/Create: `database/factories/PaymentFactory.php`
- Check/Create: `database/factories/EnrollmentFeeFactory.php`

The lifecycle tests depend on `Payment::factory()` and `EnrollmentFee::factory()`. These must exist. If they don't, create them:

- [ ] **Step 1: Check if factories exist**

Run: `ls database/factories/PaymentFactory.php database/factories/EnrollmentFeeFactory.php 2>&1`

- [ ] **Step 2: Create missing factories if needed**

`PaymentFactory.php`:
```php
<?php

namespace Database\Factories;

use App\Enums\PaymentMethod;
use App\Models\Payment;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Payment> */
class PaymentFactory extends Factory
{
    protected $model = Payment::class;

    public function definition(): array
    {
        return [
            'student_id' => Student::factory(),
            'amount' => fake()->numberBetween(1000, 10000),
            'payment_method' => PaymentMethod::Cash,
            'paid_at' => now(),
            'notes' => null,
        ];
    }
}
```

`EnrollmentFeeFactory.php`:
```php
<?php

namespace Database\Factories;

use App\Models\EnrollmentFee;
use App\Models\Payment;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<EnrollmentFee> */
class EnrollmentFeeFactory extends Factory
{
    protected $model = EnrollmentFee::class;

    public function definition(): array
    {
        return [
            'student_id' => Student::factory(),
            'payment_id' => Payment::factory(),
            'expected_amount' => fake()->numberBetween(3000, 8000),
            'starts_at' => now(),
            'expires_at' => now()->addYear(),
            'notes' => null,
        ];
    }
}
```

- [ ] **Step 3: Run tests to verify factories work**

Run: `php artisan test tests/Feature/Tenant/StudentLifecycleTest.php`
Expected: PASS

- [ ] **Step 4: Commit if factories were created**

```bash
git add database/factories/PaymentFactory.php database/factories/EnrollmentFeeFactory.php
git commit -m "feat: add Payment and EnrollmentFee factories for lifecycle tests"
```

---

## Execution Order

Tasks 1 and 8 can run in parallel (migration + factories). Then Tasks 2 → 3 → 4 → 5 → 6 → 7 sequentially.

Dependency graph:
```
Task 8 (factories) ──┐
                      ├──→ Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7
Task 1 (migration) ──┘
```
