import React from "react";
import "../utils/flippy.css";

function FlipCard({ className, children }) {
  return (
    <div className={`flip-card overflow-hidden ${className}`}>{children}</div>
  );
}

function FlipCardInner({ className, children }) {
  return (
    <div className={`flip-card-inner rounded-2xl bg-black ${className}`}>
      {children}
    </div>
  );
}

function FlipCardFront({ className, children }) {
  return (
    <div
      className={`flip-card-front px-8 pt-8 pb-0 bg-black rounded-2xl ${className}`}
    >
      {children}
    </div>
  );
}

function FlipCardBack({ className, children }) {
  return (
    <div
      className={`flip-card-back px-8 pt-8 pb-0 bg-black rounded-2xl ${className}`}
    >
      {children}
    </div>
  );
}

function FlipCardButton({ children, handler, className }) {
  return (
    <div
      onClick={() => handler()}
      className={`cursor-pointer border border-aluminium text-[10px] text-aluminium w-fit px-2 pt-1 pb-0.5 rounded-md uppercase tracking-[.12em] ${className}`}
    >
      {children}
    </div>
  );
}

function FlipCardClose({ children, handler, className }) {
  return (
    <p
      onClick={() => handler()}
      className={`cursor-pointer flex justify-between items-center border border-aluminium text-[10px] text-aluminium w-fit px-2 py-1.5 rounded-md uppercase tracking-[.15em] ${className}`}
    >
      {children}
    </p>
  );
}

function Card({ className, children }) {
  return (
    <div className={`bg-black rounded-2xl px-8 pt-8 pb-0 ${className}`}>
      {children}
    </div>
  );
}

function CardTitle({ className, children }) {
  return (
    <h3
      className={`text-white mb-4 sm:text-xl lg:text-2xl font-medium ${className}`}
    >
      {children}
    </h3>
  );
}

function CardText({ children, className }) {
  return (
    <p className={`text-aluminium text-xs sm:text-sm ${className}`}>
      {children}
    </p>
  );
}

export {
  Card,
  CardTitle,
  CardText,
  FlipCard,
  FlipCardInner,
  FlipCardFront,
  FlipCardBack,
  FlipCardButton,
  FlipCardClose,
};
