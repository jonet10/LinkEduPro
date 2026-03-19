import SchoolManagementNav from '@/components/school-management/SchoolManagementNav';

export default function SchoolManagementLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <SchoolManagementNav />
      {children}
    </div>
  );
}
