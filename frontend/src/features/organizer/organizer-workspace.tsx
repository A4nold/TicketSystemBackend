"use client";

import { useState } from "react";

import { EventCreationForm } from "@/features/organizer/event-creation-form";
import { EventManagementPanel } from "@/features/organizer/event-management-panel";

export function OrganizerWorkspace() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <EventCreationForm onCreated={() => setRefreshKey((value) => value + 1)} />
      <EventManagementPanel refreshKey={refreshKey} />
    </div>
  );
}
