import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AvatarProvider } from "./contexts/AvatarContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Vendors from "./pages/Vendors";
import VendorDetail from "./pages/VendorDetail";
import Tasks from "./pages/Tasks";
import Reports from "./pages/Reports";
import Meetings from "./pages/Meetings";
import Communications from "./pages/Communications";
import Workforce from "./pages/Workforce";
import Quality from "./pages/Quality";
import Scorecards from "./pages/Scorecards";
import Documents from "./pages/Documents";
import MeetingSummarizer from "./pages/MeetingSummarizer";
import Alerts from "./pages/Alerts";
import Connections from "./pages/Connections";
import AgentSettings from "./pages/AgentSettings";
import AgentLibrary from "./pages/AgentLibrary";
import AgentChat from "./pages/AgentChat";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/vendors" component={Vendors} />
        <Route path="/vendors/:id" component={VendorDetail} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/reports" component={Reports} />
        <Route path="/meetings" component={Meetings} />
        <Route path="/communications" component={Communications} />
        <Route path="/workforce" component={Workforce} />
        <Route path="/quality" component={Quality} />
        <Route path="/scorecards" component={Scorecards} />
        <Route path="/documents" component={Documents} />
        <Route path="/summarizer" component={MeetingSummarizer} />
        <Route path="/alerts" component={Alerts} />
        <Route path="/connections" component={Connections} />
        <Route path="/agents" component={AgentLibrary} />
        <Route path="/agents/:id/chat" component={AgentChat} />
        <Route path="/settings" component={AgentSettings} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AvatarProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AvatarProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
