import React from "react";
import { useAuth } from "@/hooks/useAuth.jsx";
import Documents from "@/components/documents/Documents";

const UpcomingDocuments = () => {
  const { user } = useAuth();
  // For CA users, we might want to use 'all' or a specific entity
  // You can adjust this based on your requirements
  const entityId = user?.role === 'CA_ACCOUNTANT' ? 'all' : null;
  
  return (
    <Documents 
      entityId={entityId} 
      quickAction={null} 
      clearQuickAction={() => {}} 
    />
  );
};

export default UpcomingDocuments;
