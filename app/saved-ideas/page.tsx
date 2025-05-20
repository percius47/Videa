import { Suspense } from "react";
import SavedIdeasClient from "./saved-ideas-client";

export default function SavedIdeasPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SavedIdeasClient />
    </Suspense>
  );
}
