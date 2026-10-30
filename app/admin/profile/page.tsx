"use client";

import React from "react";
import { ProfileView } from "@/components/common/ProfileView";

export default function AdminProfilePage() {
  return <ProfileView portalRole="admin" backHref="/admin/dashboard" />;
}
