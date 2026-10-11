import { describeExpiry, expiryStatus } from '../domain/expiry';

interface IExpiryChipProps {
  expiry?: string;
  today: string;
  soonDays: number;
}

export const ExpiryChip = ({ expiry, today, soonDays }: IExpiryChipProps) => {
  if (!expiry) return null;
  const status = expiryStatus({ expiry }, today, soonDays);
  return <span class={`chip chip--${status}`}>{describeExpiry(expiry, today)}</span>;
};
