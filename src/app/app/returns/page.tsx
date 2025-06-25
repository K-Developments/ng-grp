
"use client";

import React from "react";
import { Undo2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ReturnManagement } from "@/components/returns/ReturnManagement";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { GlobalPreloaderScreen } from "@/components/GlobalPreloaderScreen";

export default function ReturnsPage() {
  const { currentUser } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!currentUser) {
      router.replace("/");
    }
  }, [currentUser, router]);

  if (!currentUser) {
    return <GlobalPreloaderScreen message="Loading returns management..." />;
  }

  return (
    <>
      <PageHeader
        title="Return Management"
        description="Process and manage customer product returns."
        icon={Undo2}
      />
      <ReturnManagement />
    </>
  );
}
