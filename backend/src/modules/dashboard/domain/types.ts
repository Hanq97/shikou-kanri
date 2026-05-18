export interface DashboardCounts {
  activeCustomers: number;
  activeProjects: number;
  pendingQuotes: number;
  overdueAftercare: number;
}

export interface AftercareDueAlert {
  scheduleId: string;
  customerId: string;
  customerName: string;
  propertyAddress: string;
  scheduledDate: string;
  scheduleType: string;
  daysUntil: number;
}

export interface PendingApproval {
  quoteId: string;
  quoteNumber: string;
  projectName: string | null;
  customerName: string | null;
  amountTotal: string;
  submittedAt: string | null;
}

export interface RecentActivity {
  kind: string;
  timestamp: string;
  summary: string;
  link: string | null;
}

export interface DashboardSummary {
  counts: DashboardCounts;
  alerts: {
    aftercareDue14d: AftercareDueAlert[];
    pendingApprovals: PendingApproval[];
  };
  recentActivity: RecentActivity[];
}
