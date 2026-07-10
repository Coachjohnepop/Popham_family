"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import StoryTopicsHub from "@/components/StoryTopicsHub";

function StoryTopicsHubWithParams() {
  const searchParams = useSearchParams();
  const topic = searchParams.get("topic");
  return <StoryTopicsHub initialTopicId={topic} />;
}

export default function StoryTopicsHubLoader() {
  return (
    <Suspense fallback={<StoryTopicsHub />}>
      <StoryTopicsHubWithParams />
    </Suspense>
  );
}