import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';

import { Customer } from './customer.model';
import { CustomersService } from './customers.service';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-5xl p-6">
      <header class="mb-6 flex items-center justify-between gap-4">
        <h1 class="text-2xl font-semibold text-gray-900">Customers</h1>
        <div class="flex items-center gap-2">
          <input
            type="search"
            placeholder="Search by name…"
            [value]="keyword()"
            (input)="onSearch($event)"
            class="w-64 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            class="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            (click)="openCreateForm()"
          >
            New Customer
          </button>
        </div>
      </header>

      @if (loading()) {
        <div class="rounded-md border border-gray-200 bg-white p-6 text-center text-gray-500">
          Loading customers…
        </div>
      } @else if (error()) {
        <div class="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {{ error() }}
        </div>
      } @else {
        <div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">ID</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Name</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Email</th>
                <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              @for (customer of customers(); track customer.id) {
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3 text-sm text-gray-900">{{ customer.id }}</td>
                  <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ customer.name }}</td>
                  <td class="px-4 py-3 text-sm text-gray-600">{{ customer.email }}</td>
                  <td class="px-4 py-3 text-right">
                    <div class="flex justify-end gap-1">
                      <button
                        type="button"
                        aria-label="Edit"
                        class="rounded-md p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
                        [disabled]="deletingId() === customer.id"
                        (click)="openEditForm(customer)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
                          <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        aria-label="Delete"
                        class="rounded-md p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        [disabled]="deletingId() === customer.id"
                        (click)="onDelete(customer)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
                          <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482c-.782-.122-1.57-.221-2.365-.298V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="px-4 py-6 text-center text-sm text-gray-500">
                    No customers found.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>

    <dialog
      #dialog
      (close)="onDialogClose()"
      (click)="onBackdropClick($event)"
      class="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 p-0 shadow-xl backdrop:bg-black/50"
    >
      <form [formGroup]="form" (ngSubmit)="submit()" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 class="text-base font-semibold text-gray-900">{{ dialogTitle() }}</h2>
          <button
            type="button"
            class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
            (click)="closeForm()"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <div class="space-y-4 px-5 py-4">
          <div>
            <label for="name" class="mb-1 block text-xs font-medium text-gray-700">Name</label>
            <input
              id="name"
              type="text"
              formControlName="name"
              autocomplete="name"
              class="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            @if (form.controls.name.touched && form.controls.name.invalid) {
              <p class="mt-1 text-xs text-red-600">
                @if (form.controls.name.errors?.['required']) {
                  Name is required.
                } @else if (form.controls.name.errors?.['minlength']) {
                  Name must be at least 2 characters.
                }
              </p>
            }
          </div>
          <div>
            <label for="email" class="mb-1 block text-xs font-medium text-gray-700">Email</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              autocomplete="email"
              class="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            @if (form.controls.email.touched && form.controls.email.invalid) {
              <p class="mt-1 text-xs text-red-600">
                @if (form.controls.email.errors?.['required']) {
                  Email is required.
                } @else if (form.controls.email.errors?.['email']) {
                  Please enter a valid email address.
                }
              </p>
            }
          </div>

          @if (submitError()) {
            <p class="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              {{ submitError() }}
            </p>
          }
        </div>

        <div class="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-5 py-3">
          <button
            type="button"
            class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            (click)="closeForm()"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            [disabled]="submitting() || form.invalid"
          >
            {{ submitting() ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </form>
    </dialog>
  `,
})
export class CustomersComponent {
  private readonly service = inject(CustomersService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly search$ = new Subject<string>();
  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  readonly customers = signal<Customer[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly keyword = signal('');

  readonly editingId = signal<number | null>(null);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly deletingId = signal<number | null>(null);

  readonly dialogTitle = computed(() =>
    this.editingId() === null ? 'New Customer' : 'Edit Customer',
  );

  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  constructor() {
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap((kw) =>
          this.service.searchCustomers(kw).pipe(
            catchError((err: unknown) => {
              const message = err instanceof Error ? err.message : 'Failed to load customers.';
              this.error.set(message);
              return of<Customer[]>([]);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((data) => {
        this.customers.set(data);
        this.loading.set(false);
      });

    this.search$.next('');
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.keyword.set(value);
    this.search$.next(value);
  }

  openCreateForm(): void {
    this.editingId.set(null);
    this.form.reset();
    this.submitError.set(null);
    this.dialogRef()?.nativeElement.showModal();
  }

  openEditForm(customer: Customer): void {
    this.editingId.set(customer.id);
    this.form.setValue({ name: customer.name, email: customer.email });
    this.submitError.set(null);
    this.dialogRef()?.nativeElement.showModal();
  }

  closeForm(): void {
    this.dialogRef()?.nativeElement.close();
  }

  onDialogClose(): void {
    this.submitting.set(false);
    this.submitError.set(null);
    this.editingId.set(null);
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialogRef()?.nativeElement) {
      this.closeForm();
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    const id = this.editingId();
    const payload = this.form.getRawValue();
    const request$ =
      id === null
        ? this.service.createCustomer(payload)
        : this.service.updateCustomer(id, payload);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        if (id === null) {
          this.customers.update((list) => [...list, saved]);
        } else {
          const updated: Customer = { id, ...payload };
          this.customers.update((list) => list.map((c) => (c.id === id ? updated : c)));
        }
        this.submitting.set(false);
        this.closeForm();
      },
      error: (err: unknown) => {
        const action = id === null ? 'create' : 'update';
        const message = err instanceof Error ? err.message : `Failed to ${action} customer.`;
        this.submitError.set(message);
        this.submitting.set(false);
      },
    });
  }

  onDelete(customer: Customer): void {
    if (!confirm(`Delete customer "${customer.name}"?`)) {
      return;
    }

    this.deletingId.set(customer.id);
    this.error.set(null);

    this.service
      .deleteCustomer(customer.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.customers.update((list) => list.filter((c) => c.id !== customer.id));
          this.deletingId.set(null);
        },
        error: (err: unknown) => {
          const message = err instanceof Error ? err.message : 'Failed to delete customer.';
          this.error.set(message);
          this.deletingId.set(null);
        },
      });
  }
}
