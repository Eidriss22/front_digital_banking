import { Customer } from '../customers/customer.model';

interface BaseAccount {
  id: string;
  balance: number;
  createdAt: string;
  customerDTO: Customer;
  status: string | null;
}

export interface CurrentAccount extends BaseAccount {
  type: 'CurrentAccount';
  overDraft: number;
}

export interface SavingAccount extends BaseAccount {
  type: 'SavingAccount';
  interestRate: number;
}

export type Account = CurrentAccount | SavingAccount;
