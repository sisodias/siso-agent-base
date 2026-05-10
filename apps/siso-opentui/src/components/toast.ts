import { fit } from "../ui/layout";
export type Toast = { title: string; message: string; ttl: number };
export function toastRows(toasts: Toast[], width: number) {
  return toasts.filter((toast) => toast.ttl > 0).slice(-3).map((toast) => fit(`${toast.title}: ${toast.message}`, width)).join("\n");
}
