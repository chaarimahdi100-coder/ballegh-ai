"use client";

import React from "react";
import { ProfileView } from "@/components/common/ProfileView";

export default function CitizenProfilePage() {
  return <ProfileView portalRole="citizen" backHref="/citizen/dashboard" />;
}
