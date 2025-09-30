import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import Vouchers from './Vouchers';
import Invoices from './Invoices';

const FinancePage = () => {
  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-3xl sm:text-5xl font-bold text-white mb-8">Finance</h1>
      <Tabs defaultValue="vouchers" className="w-full">
        <div className="flex items-center justify-between mb-8">
          <TabsList className="inline-flex items-center justify-center gap-4 text-lg">
            <TabsTrigger value="vouchers" className="px-4 py-2 transition-all duration-300 ease-in-out">Vouchers</TabsTrigger>
            <TabsTrigger value="invoices" className="px-4 py-2 transition-all duration-300 ease-in-out">Invoices</TabsTrigger>
          </TabsList>
        </div>
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
