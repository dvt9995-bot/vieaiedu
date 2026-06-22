"use client";
import { Component, type ReactNode } from "react";

// Bọc từng tab admin: nếu 1 tab lỗi render thì chỉ tab đó báo lỗi, KHÔNG sập cả trang admin.
export default class AdminErrorBoundary extends Component<{ children: ReactNode; label?: string }, { err: Error | null }> {
  state: { err: Error | null } = { err: null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  componentDidCatch(err: Error) { try { fetch("/api/log-error", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: `admin:${this.props.label}: ${err.message}`, source: "admin" }) }).catch(() => {}); } catch { /* noop */ } }
  render() {
    if (this.state.err) {
      return (
        <div className="rounded-card border border-accent/30 bg-accent-weak p-6 text-sm">
          <p className="font-bold text-accent text-base">Mục “{this.props.label || "này"}” gặp lỗi hiển thị</p>
          <p className="text-ink-2 mt-1.5 break-words font-mono text-xs">{this.state.err.message}</p>
          <button onClick={() => this.setState({ err: null })} className="mt-4 rounded-full bg-accent text-white font-semibold px-5 py-2.5 cursor-pointer">Thử lại</button>
        </div>
      );
    }
    return this.props.children;
  }
}
