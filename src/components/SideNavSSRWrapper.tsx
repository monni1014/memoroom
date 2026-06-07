"use client";

import React from "react";
import dynamic from "next/dynamic";

const DynamicSideNav = dynamic(
  () => import("./SideNav").then((mod) => mod.SideNav),
  {
    ssr: false,
    loading: () => (
      <nav className="fixed left-0 top-0 h-full w-20 md:w-64 bg-white border-r border-slate-200 flex flex-col z-50" />
    ),
  }
);

export function SideNavSSRWrapper() {
  return <DynamicSideNav />;
}
