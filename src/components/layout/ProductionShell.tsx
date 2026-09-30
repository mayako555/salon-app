'use client';
import { AuthProvider } from '@/lib/auth-context';
import { AppLayout } from './AppLayout';
import { TrackingProvider } from './TrackingProvider';
import { TestPlanFeedbackModal } from './TestPlanFeedbackModal';
import AIChatWidget from '@/components/AIChatWidget';
import { Toaster } from 'sonner';
export default function ProductionShell({children}:{children:React.ReactNode}) {
 return <AuthProvider><TrackingProvider><AppLayout>{children}</AppLayout><TestPlanFeedbackModal/><AIChatWidget/></TrackingProvider><Toaster position="top-center" richColors/></AuthProvider>;
}
