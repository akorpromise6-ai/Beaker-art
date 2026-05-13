import dynamic from "next/dynamic";

const BeaksArt = dynamic(() => import("../components/BeaksArt"), { ssr: false });

export default function Home() {
  return (
    <main>
      <BeaksArt />
    </main>
  );
}
