import { redirect } from "next/navigation";

// The dashboard overview is on the roadmap; inventory is the first live admin screen.
export default function AdminIndex() {
  redirect("/admin/inventory");
}
