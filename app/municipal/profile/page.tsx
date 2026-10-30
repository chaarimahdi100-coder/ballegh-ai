"use client";

import React from "react";
import { ProfileView } from "@/components/common/ProfileView";

export default function MunicipalProfilePage() {
  return <ProfileView portalRole="municipal_agent" backHref="/municipal/dashboard" />;
}
