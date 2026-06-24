"use client";
import Link from "next/link";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import { buttonClass, type ButtonVariant, type ButtonSize } from "@/lib/button";

interface BaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
}

type Props = BaseProps & { href?: string } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps>;

// Nút dùng chung toàn app. Có href → render <Link>, không thì <button>.
export default function Button({ variant, size, fullWidth, className, children, href, ...rest }: Props) {
  const cls = buttonClass({ variant, size, fullWidth, className });
  if (href) return <Link href={href} className={cls} {...(rest as unknown as AnchorHTMLAttributes<HTMLAnchorElement>)}>{children}</Link>;
  return <button className={cls} {...rest}>{children}</button>;
}
