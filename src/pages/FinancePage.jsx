import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import Vouchers from './Vouchers';
import Invoices from './Invoices';

const FinancePage = () => {
  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-3xl sm:text-5xl font-bold text-white mb-8">Finance</h1>
      <Tabs defaultValue="vouchers" className="w-full">
        <TabsList className="glass-tab-list">
          <TabsTrigger value="vouchers">Vouchers</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>
        <TabsContent value="vouchers">
          <Vouchers />
        </TabsContent>
        <TabsContent value="invoices">
          <Invoices />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancePage;
