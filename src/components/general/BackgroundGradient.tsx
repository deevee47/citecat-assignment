import React from 'react'

const BackgroundGradient = () => (
  <>
    <div className="fixed inset-0 bg-[#0D0B1F]" />
    <div className="fixed inset-0 overflow-hidden">
      <div
        className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-[200px] opacity-20"
        style={{
          animation: "pulse 8s ease-in-out infinite",
        }}
      />
      <div
        className="absolute top-0 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-[200px] opacity-20"
        style={{
          animation: "pulse 10s ease-in-out infinite",
          animationDelay: "2s",
        }}
      />
      <div
        className="absolute -bottom-40 left-20 w-80 h-80 bg-slate-300 rounded-full mix-blend-multiply filter blur-[200px] opacity-20"
        style={{
          animation: "pulse 12s ease-in-out infinite",
          animationDelay: "4s",
        }}
      />
    </div>
  </>
);

export default BackgroundGradient
