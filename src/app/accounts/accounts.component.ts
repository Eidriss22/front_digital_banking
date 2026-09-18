import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, tap } from 'rxjs';

import { Account } from './account.model';
import { AccountsService } from './accounts.service';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-6xl p-6">
      <header class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-gray-900">Accounts</h1>
        <button
          type="button"
          class="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          [disabled]="loading()"
          (click)="load()"
        >
          Refresh
        </button>
      </header>

      @if (loading()) {
        <div class="rounded-md border border-gray-200 bg-white p-6 text-center text-gray-500">
          Loading accounts…
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
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Type</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Customer</th>
                <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Balance</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Details</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Created</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              @for (account of accounts(); track account.id) {
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3 font-mono text-xs text-gray-500">{{ account.id }}</td>
                  <td class="px-4 py-3 text-sm">
                    @if (account.type === 'CurrentAccount') {
                      <span class="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Current
                      </span>
                    } @else {
                      <span class="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Saving
                      </span>
                    }
                  </td>
                  <td class="px-4 py-3 text-sm">
                    <div class="font-medium text-gray-900">{{ account.customerDTO.name }}</div>
                    <div class="text-xs text-gray-500">{{ account.customerDTO.email }}</div>
                  </td>
                  <td class="px-4 py-3 text-right font-mono text-sm text-gray-900">
                    {{ account.balance | number: '1.2-2' }}
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-600">
                    @if (account.type === 'CurrentAccount') {
                      Overdraft: {{ account.overDraft | number: '1.2-2' }}
                    } @else {
                      Interest: {{ account.interestRate }}%
                    }
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-600">
                    {{ account.createdAt | date: 'medium' }}
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="px-4 py-6 text-center text-sm text-gray-500">
                    No accounts found.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
})
export class AccountsComponent {
  private readonly service = inject(AccountsService);

  readonly accounts = signal<Account[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.service
      .getAccounts()
      .pipe(
        tap((data) => this.accounts.set(data)),
        catchError((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Failed to load accounts.';
          this.error.set(message);
          this.accounts.set([]);
          return of<Account[]>([]);
        }),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.loading.set(false));
  }
}
