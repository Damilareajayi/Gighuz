import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) { return clsx(inputs); }

export function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function statusClass(status: string) {
  const map: Record<string, string> = {
    pending_structure: 'status-pending',
    structured:        'status-pending',
    matched:           'status-matched',
    in_progress:       'status-progress',
    under_review:      'status-auditing',
    auditing:          'status-auditing',
    submitted:          'status-auditing',
    pending:            'status-pending',
    approved:          'status-approved',
    completed:         'status-paid',
    paid:              'status-paid',
    flagged:           'status-flagged',
    cancelled:         'status-pending',
  };
  return map[status] || 'status-pending';
}

export function statusLabel(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
