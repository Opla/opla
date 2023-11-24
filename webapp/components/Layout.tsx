import '@/app/globals.css';
import Sidebar from '@/components/Sidebar';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      {children}
    </main>
  );
}
