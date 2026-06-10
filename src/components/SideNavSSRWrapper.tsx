"use client";

import React from "react";
import dynamic from "next/dynamic";

const DynamicSideNav = dynamic(
  () => import("./SideNav").then((mod) => mod.SideNav),
  {
    ssr: false,
    loading: () => (
      <nav className="fixed z-50 bg-white border-slate-200 bottom-0 left-0 right-0 h-16 border-t md:top-0 md:right-auto md:h-full md:w-64 md:border-t-0 md:border-r" />
    ),
  }
);

export function SideNavSSRWrapper() {
  return <DynamicSideNav />;
}
