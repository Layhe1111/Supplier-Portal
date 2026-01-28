import { Suspense } from 'react';
import DashboardClient from './DashboardClient';

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading dashboard...</div>}>
      <DashboardClient />
    </Suspense>
  );
}
