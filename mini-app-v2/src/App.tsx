import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ToastProvider } from "@/components/layout/Toast";
import { HomePage } from "@/pages/HomePage";
import { TaskBoardPage } from "@/pages/TaskBoardPage";
import { TaskCreatePage } from "@/pages/TaskCreatePage";
import { TaskDetailPage } from "@/pages/TaskDetailPage";
import { CalendarPage } from "@/pages/CalendarPage";
import { ShipmentPage } from "@/pages/ShipmentPage";
import { OmxPage } from "@/pages/OmxPage";
import { HrPage } from "@/pages/HrPage";

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/tasks" element={<TaskBoardPage />} />
            <Route path="/tasks/new" element={<TaskCreatePage />} />
            <Route path="/tasks/:id" element={<TaskDetailPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/shipment" element={<ShipmentPage />} />
            <Route path="/omx" element={<OmxPage />} />
            <Route path="/hr" element={<HrPage />} />
          </Routes>
        </AppLayout>
      </ToastProvider>
    </BrowserRouter>
  );
}
