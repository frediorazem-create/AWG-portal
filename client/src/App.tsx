import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Layout } from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Chat from "@/pages/Chat";
import Announcements from "@/pages/Announcements";
import CalendarPage from "@/pages/CalendarPage";
import Tasks from "@/pages/Tasks";
import Documents from "@/pages/Documents";
import Voting from "@/pages/Voting";
import Members from "@/pages/Members";
import VideoConference from "@/pages/VideoConference";
import Mailing from "@/pages/Mailing";
import NotFound from "@/pages/not-found";

function AppRouter() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/chat" component={Chat} />
        <Route path="/announcements" component={Announcements} />
        <Route path="/calendar" component={CalendarPage} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/documents" component={Documents} />
        <Route path="/voting" component={Voting} />
        <Route path="/members" component={Members} />
        <Route path="/video" component={VideoConference} />
        <Route path="/mailing" component={Mailing} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <Toaster />
          <Router hook={useHashLocation}>
            <AppRouter />
          </Router>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
