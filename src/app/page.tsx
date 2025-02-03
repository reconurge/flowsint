import { Link } from "@heroui/link";
import { Button } from "@radix-ui/themes";

export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
      <div className="inline-block max-w-xl text-center justify-center">
        <Link href="/dashboard"><Button>Dashboard</Button></Link>
      </div>
    </section>
  );
}
